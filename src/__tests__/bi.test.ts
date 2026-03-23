import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    invoiceItem: { findMany: vi.fn() },
    order: { count: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() },
    invoice: { findMany: vi.fn() },
  },
}))

vi.mock('@/lib/jwt', () => ({ verifyToken: vi.fn() }))

import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { GET as biDataGET } from '@/app/api/bi/data/route'
import { GET as biExportGET } from '@/app/api/bi/export/route'

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

const now = new Date()

const mockInvoiceItems = [
  { itemName: 'Papel A4', quantity: 10, unitPrice: 25.0, total: 250.0 },
  { itemName: 'Caneta BIC', quantity: 50, unitPrice: 2.0, total: 100.0 },
]

const mockApprovedOrders = [
  {
    createdAt: now,
    items: [{ referenceValue: 100.0, quantity: 2 }],
  },
]

const mockInvoicesWithSecretary = [
  {
    totalBilled: 350.0,
    secretary: { name: 'Secretaria de Educação' },
  },
]

// ─── GET /api/bi/data ───────────────────────────────────────────────────────────

describe('GET /api/bi/data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.invoiceItem.findMany).mockResolvedValue(mockInvoiceItems as never)
    vi.mocked(prisma.order.count).mockResolvedValue(3)
    vi.mocked(prisma.order.findMany).mockResolvedValue(mockApprovedOrders as never)
    vi.mocked(prisma.order.groupBy).mockResolvedValue([
      { status: 'APPROVED', _count: { _all: 2 } },
      { status: 'OPEN', _count: { _all: 1 } },
    ] as never)
    vi.mocked(prisma.invoice.findMany).mockResolvedValue(mockInvoicesWithSecretary as never)
  })

  it('retorna 200 com todos os campos esperados', async () => {
    const req = makeRequest('http://localhost/api/bi/data?period=MONTHLY')
    const res = await biDataGET(req)

    expect(res.status).toBe(200)

    const body = await res.json() as {
      period: string
      totalConsumed: number
      ordersInProgress: number
      ordersCancelledOrDisputed: number
      dailyAcceptedBudgets: unknown[]
      ordersByStatus: unknown[]
      consumptionBySecretary: unknown[]
      topItems: unknown[]
    }

    expect(body).toHaveProperty('period', 'MONTHLY')
    expect(body).toHaveProperty('totalConsumed')
    expect(body).toHaveProperty('ordersInProgress')
    expect(body).toHaveProperty('ordersCancelledOrDisputed')
    expect(body).toHaveProperty('dailyAcceptedBudgets')
    expect(body).toHaveProperty('ordersByStatus')
    expect(body).toHaveProperty('consumptionBySecretary')
    expect(body).toHaveProperty('topItems')

    expect(typeof body.totalConsumed).toBe('number')
    expect(typeof body.ordersInProgress).toBe('number')
    expect(typeof body.ordersCancelledOrDisputed).toBe('number')
    expect(Array.isArray(body.dailyAcceptedBudgets)).toBe(true)
    expect(Array.isArray(body.ordersByStatus)).toBe(true)
    expect(Array.isArray(body.consumptionBySecretary)).toBe(true)
    expect(Array.isArray(body.topItems)).toBe(true)
  })

  it('retorna 401 sem autenticação', async () => {
    const req = new NextRequest('http://localhost/api/bi/data', {
      method: 'GET',
      // No Authorization header
    })
    const res = await biDataGET(req)
    expect(res.status).toBe(401)
    const body = await res.json() as { error: string }
    expect(body.error).toContain('Não autenticado')
  })

  it('usa MONTHLY como período padrão quando nenhum é fornecido', async () => {
    const req = makeRequest('http://localhost/api/bi/data')
    const res = await biDataGET(req)

    expect(res.status).toBe(200)
    const body = await res.json() as { period: string }
    expect(body.period).toBe('MONTHLY')
  })

  it('período WEEKLY usa intervalo diferente de MONTHLY', async () => {
    vi.mocked(prisma.invoiceItem.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.order.findMany).mockResolvedValue([] as never)

    const reqWeekly = makeRequest('http://localhost/api/bi/data?period=WEEKLY')
    await biDataGET(reqWeekly)
    const weeklyCall = vi.mocked(prisma.invoiceItem.findMany).mock.calls[0][0] as {
      where: { invoice: { createdAt: { gte: Date; lte: Date } } }
    }
    const weeklyFrom = weeklyCall.where.invoice.createdAt.gte
    const weeklyTo = weeklyCall.where.invoice.createdAt.lte
    const weeklyDiff = weeklyTo.getTime() - weeklyFrom.getTime()

    vi.mocked(prisma.invoiceItem.findMany).mockClear()

    const reqMonthly = makeRequest('http://localhost/api/bi/data?period=MONTHLY')
    await biDataGET(reqMonthly)
    const monthlyCall = vi.mocked(prisma.invoiceItem.findMany).mock.calls[0][0] as {
      where: { invoice: { createdAt: { gte: Date; lte: Date } } }
    }
    const monthlyFrom = monthlyCall.where.invoice.createdAt.gte
    const monthlyTo = monthlyCall.where.invoice.createdAt.lte
    const monthlyDiff = monthlyTo.getTime() - monthlyFrom.getTime()

    // WEEKLY interval should be shorter than MONTHLY
    expect(weeklyDiff).toBeLessThan(monthlyDiff)

    // WEEKLY should be ~7 days
    const weeklyDays = weeklyDiff / (1000 * 60 * 60 * 24)
    expect(weeklyDays).toBeCloseTo(7, 0)

    // MONTHLY should be ~28-31 days
    const monthlyDays = monthlyDiff / (1000 * 60 * 60 * 24)
    expect(monthlyDays).toBeGreaterThan(27)
    expect(monthlyDays).toBeLessThan(32)
  })
})

// ─── GET /api/bi/export ─────────────────────────────────────────────────────────

describe('GET /api/bi/export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.invoiceItem.findMany).mockResolvedValue(mockInvoiceItems as never)
  })

  it('retorna 200 para formato CSV', async () => {
    const req = makeRequest('http://localhost/api/bi/export?period=MONTHLY&format=CSV')
    const res = await biExportGET(req)
    expect(res.status).toBe(200)
    const contentType = res.headers.get('content-type')
    expect(contentType).toContain('text/csv')
  })

  it('retorna 200 para formato PDF', async () => {
    const req = makeRequest('http://localhost/api/bi/export?period=MONTHLY&format=PDF')
    const res = await biExportGET(req)
    expect(res.status).toBe(200)
    const contentType = res.headers.get('content-type')
    expect(contentType).toContain('application/pdf')
  })

  it('retorna 200 para formato EXCEL', async () => {
    const req = makeRequest('http://localhost/api/bi/export?period=MONTHLY&format=EXCEL')
    const res = await biExportGET(req)
    expect(res.status).toBe(200)
    const contentType = res.headers.get('content-type')
    expect(contentType).toContain('spreadsheetml')
  })

  it('retorna 401 sem autenticação', async () => {
    const req = new NextRequest('http://localhost/api/bi/export', {
      method: 'GET',
    })
    const res = await biExportGET(req)
    expect(res.status).toBe(401)
  })
})
