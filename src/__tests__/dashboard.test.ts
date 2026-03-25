import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    budgetContract: { findMany: vi.fn() },
    secretary: { findMany: vi.fn() },
    order: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/jwt', () => ({ verifyToken: vi.fn() }))

import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { GET } from '@/app/api/dashboard/route'

const mainManager = {
  id: 'user-1',
  email: 'admin@test.com',
  role: 'MAIN_MANAGER',
  fullName: 'Admin',
  secretaryId: null,
  passwordHash: 'hash',
}

function makeRequest(url: string): NextRequest {
  return new NextRequest(url, {
    method: 'GET',
    headers: { Authorization: 'Bearer valid.token' },
  })
}

const mockContracts = [
  { initialValue: 1000000, currentTotal: 1200000, consumedInOrders: 400000 },
  { initialValue: 500000, currentTotal: 500000, consumedInOrders: 150000 },
]

const mockSecretaries = [
  { id: 'sec-1', name: 'Secretaria de Educação', budgetAllocated: 600000, budgetUsed: 250000, commitments: [] },
  { id: 'sec-2', name: 'Secretaria de Saúde', budgetAllocated: 400000, budgetUsed: 300000, commitments: [] },
]

const mockRecentOrders = [
  {
    id: 'order-1',
    code: 'OS-2026-001',
    name: 'Compra de material escolar',
    status: 'OPEN',
    createdAt: new Date('2026-03-01T10:00:00Z'),
    secretary: { id: 'sec-1', name: 'Secretaria de Educação' },
  },
  {
    id: 'order-2',
    code: 'OS-2026-002',
    name: 'Manutenção de equipamentos',
    status: 'IN_QUOTATION',
    createdAt: new Date('2026-03-02T14:00:00Z'),
    secretary: { id: 'sec-2', name: 'Secretaria de Saúde' },
  },
]

// ─── GET /api/dashboard ────────────────────────────────────────────────────────

describe('GET /api/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.budgetContract.findMany).mockResolvedValue(mockContracts as never)
    vi.mocked(prisma.secretary.findMany).mockResolvedValue(mockSecretaries as never)
    // order.count returns different values per call based on where clause
    vi.mocked(prisma.order.count)
      .mockResolvedValueOnce(0)  // draft
      .mockResolvedValueOnce(5)  // open
      .mockResolvedValueOnce(3)  // inProgress
      .mockResolvedValueOnce(2)  // pendingApproval
      .mockResolvedValueOnce(10) // finished
      .mockResolvedValueOnce(1)  // cancelled
    vi.mocked(prisma.order.findMany).mockResolvedValue(mockRecentOrders as never)
  })

  it('retorna 200 com estrutura correta', async () => {
    const req = makeRequest('http://localhost/api/dashboard')
    const res = await GET(req)

    expect(res.status).toBe(200)

    const body = await res.json() as {
      budgetTotal: number
      budgetUsed: number
      budgetRemaining: number
      secretaryList: unknown[]
      ordersSummary: {
        open: number
        inProgress: number
        pendingApproval: number
        finished: number
        cancelled: number
      }
      recentOrders: unknown[]
    }

    expect(body).toHaveProperty('budgetTotal')
    expect(body).toHaveProperty('budgetUsed')
    expect(body).toHaveProperty('budgetRemaining')
    expect(body).toHaveProperty('secretaryList')
    expect(body).toHaveProperty('ordersSummary')
    expect(body).toHaveProperty('recentOrders')

    // Budget calculations: currentTotal sum = 1200000 + 500000 = 1700000
    expect(body.budgetTotal).toBe(1700000)
    // consumedInOrders sum = 400000 + 150000 = 550000
    expect(body.budgetUsed).toBe(550000)
    expect(body.budgetRemaining).toBe(1150000)

    expect(Array.isArray(body.secretaryList)).toBe(true)
    expect(body.secretaryList).toHaveLength(2)

    expect(Array.isArray(body.recentOrders)).toBe(true)
  })

  it('retorna 401 sem autenticação', async () => {
    const req = new NextRequest('http://localhost/api/dashboard', {
      method: 'GET',
      // No Authorization header
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('ordersSummary tem todos os campos obrigatórios', async () => {
    const req = makeRequest('http://localhost/api/dashboard')
    const res = await GET(req)

    expect(res.status).toBe(200)

    const body = await res.json() as {
      ordersSummary: Record<string, number>
    }

    expect(body.ordersSummary).toHaveProperty('open')
    expect(body.ordersSummary).toHaveProperty('inProgress')
    expect(body.ordersSummary).toHaveProperty('pendingApproval')
    expect(body.ordersSummary).toHaveProperty('finished')
    expect(body.ordersSummary).toHaveProperty('cancelled')

    // Verify actual values from mocks
    expect(body.ordersSummary.open).toBe(5)
    expect(body.ordersSummary.inProgress).toBe(3)
    expect(body.ordersSummary.pendingApproval).toBe(2)
    expect(body.ordersSummary.finished).toBe(10)
    expect(body.ordersSummary.cancelled).toBe(1)
  })

  it('secretaryList contém campos de orçamento por secretaria', async () => {
    const req = makeRequest('http://localhost/api/dashboard')
    const res = await GET(req)

    expect(res.status).toBe(200)

    const body = await res.json() as {
      secretaryList: Array<{
        id: string
        name: string
        budgetAllocated: number
        budgetUsed: number
        budgetRemaining: number
        percentUsed: number
      }>
    }

    const first = body.secretaryList[0]
    expect(first).toHaveProperty('id')
    expect(first).toHaveProperty('name')
    expect(first).toHaveProperty('budgetAllocated')
    expect(first).toHaveProperty('budgetUsed')
    expect(first).toHaveProperty('budgetRemaining')
    expect(first).toHaveProperty('percentUsed')

    // Secretaria de Educação: 250000/600000 ~ 41.67%
    expect(first.budgetRemaining).toBe(350000)
    expect(first.percentUsed).toBeCloseTo(41.67, 1)
  })

  it('recentOrders retorna até 10 OS com campos corretos', async () => {
    const req = makeRequest('http://localhost/api/dashboard')
    const res = await GET(req)

    expect(res.status).toBe(200)

    const body = await res.json() as {
      recentOrders: Array<{
        id: string
        code: string
        name: string
        status: string
        createdAt: string
        secretaryId: string
        secretaryName: string
      }>
    }

    expect(body.recentOrders).toHaveLength(2)
    const first = body.recentOrders[0]
    expect(first).toHaveProperty('id')
    expect(first).toHaveProperty('code')
    expect(first).toHaveProperty('name')
    expect(first).toHaveProperty('status')
    expect(first).toHaveProperty('createdAt')
    expect(first).toHaveProperty('secretaryId')
    expect(first).toHaveProperty('secretaryName')
  })
})
