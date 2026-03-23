import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    stockItem: { findMany: vi.fn(), update: vi.fn() },
    stockMovement: { findMany: vi.fn() },
  },
}))

vi.mock('@/lib/jwt', () => ({ verifyToken: vi.fn() }))

import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { GET as analyticsGET } from '@/app/api/stock/analytics/route'

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

const mockMovements = [
  {
    id: 'mov-1',
    itemId: 'item-1',
    quantity: 100,
    value: 500,
    occurredAt: now,
    item: { id: 'item-1', name: 'Papel A4', unit: 'resma' },
  },
  {
    id: 'mov-2',
    itemId: 'item-2',
    quantity: 50,
    value: 200,
    occurredAt: now,
    item: { id: 'item-2', name: 'Caneta BIC', unit: 'un' },
  },
  {
    id: 'mov-3',
    itemId: 'item-3',
    quantity: 20,
    value: 100,
    occurredAt: now,
    item: { id: 'item-3', name: 'Grampeador', unit: 'un' },
  },
]

const mockAllItems = [
  { id: 'item-1', name: 'Papel A4', quantity: 50, unitPrice: 5.0, unit: 'resma' },
  { id: 'item-2', name: 'Caneta BIC', quantity: 100, unitPrice: 2.0, unit: 'un' },
  { id: 'item-3', name: 'Grampeador', quantity: 10, unitPrice: 10.0, unit: 'un' },
  { id: 'item-4', name: 'Tesoura', quantity: 5, unitPrice: 8.0, unit: 'un' },
]

// ─── GET /api/stock/analytics ──────────────────────────────────────────────────

describe('GET /api/stock/analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.stockMovement.findMany).mockResolvedValue(mockMovements as never)
    vi.mocked(prisma.stockItem.findMany).mockResolvedValue(mockAllItems as never)
    vi.mocked(prisma.stockItem.update).mockResolvedValue({} as never)
  })

  it('retorna 200 com todos os campos esperados', async () => {
    const req = makeRequest('http://localhost/api/stock/analytics?period=MONTHLY')
    const res = await analyticsGET(req)

    expect(res.status).toBe(200)

    const body = await res.json() as {
      period: string
      topMovedItems: unknown[]
      zeroMovementItems: unknown[]
      frozenStockValue: number
      atypicalMovements: unknown[]
      abcDistribution: { A: number; B: number; C: number }
      abcItems: unknown[]
      recommendations: string[]
    }

    expect(body).toHaveProperty('period', 'MONTHLY')
    expect(body).toHaveProperty('topMovedItems')
    expect(body).toHaveProperty('zeroMovementItems')
    expect(body).toHaveProperty('frozenStockValue')
    expect(body).toHaveProperty('atypicalMovements')
    expect(body).toHaveProperty('abcDistribution')
    expect(body).toHaveProperty('abcItems')
    expect(body).toHaveProperty('recommendations')

    expect(Array.isArray(body.topMovedItems)).toBe(true)
    expect(Array.isArray(body.zeroMovementItems)).toBe(true)
    expect(Array.isArray(body.atypicalMovements)).toBe(true)
    expect(Array.isArray(body.abcItems)).toBe(true)
    expect(Array.isArray(body.recommendations)).toBe(true)

    expect(typeof body.abcDistribution.A).toBe('number')
    expect(typeof body.abcDistribution.B).toBe('number')
    expect(typeof body.abcDistribution.C).toBe('number')
  })

  it('retorna 401 sem autenticação', async () => {
    const req = new NextRequest('http://localhost/api/stock/analytics', {
      method: 'GET',
      // No Authorization header
    })
    const res = await analyticsGET(req)
    expect(res.status).toBe(401)
    const body = await res.json() as { error: string }
    expect(body.error).toContain('Não autenticado')
  })

  it('usa MONTHLY como período padrão quando nenhum é fornecido', async () => {
    const req = makeRequest('http://localhost/api/stock/analytics')
    const res = await analyticsGET(req)

    expect(res.status).toBe(200)
    const body = await res.json() as { period: string }
    expect(body.period).toBe('MONTHLY')
  })

  it('identifica itens sem movimentação no período', async () => {
    // item-4 (Tesoura) has no movement in mockMovements
    const req = makeRequest('http://localhost/api/stock/analytics?period=MONTHLY')
    const res = await analyticsGET(req)
    const body = await res.json() as { zeroMovementItems: { id: string; name: string }[] }

    expect(body.zeroMovementItems.some(i => i.name === 'Tesoura')).toBe(true)
    expect(body.zeroMovementItems.some(i => i.name === 'Papel A4')).toBe(false)
  })
})

// ─── ABC Classification ────────────────────────────────────────────────────────

describe('Curva ABC — classificação por valor acumulado', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.stockItem.update).mockResolvedValue({} as never)
  })

  it('classifica corretamente itens A=top 80%, B=próximos 15%, C=restante', async () => {
    // Total value = 800 + 150 + 50 = 1000
    // item-a: 800 (80% cumulative) → A
    // item-b: 150 (95% cumulative) → B
    // item-c: 50 (100% cumulative) → C
    const movements = [
      { id: 'mv-a', itemId: 'item-a', quantity: 10, value: 800, occurredAt: now, item: { id: 'item-a', name: 'Item A', unit: 'un' } },
      { id: 'mv-b', itemId: 'item-b', quantity: 5, value: 150, occurredAt: now, item: { id: 'item-b', name: 'Item B', unit: 'un' } },
      { id: 'mv-c', itemId: 'item-c', quantity: 2, value: 50, occurredAt: now, item: { id: 'item-c', name: 'Item C', unit: 'un' } },
    ]
    vi.mocked(prisma.stockMovement.findMany).mockResolvedValue(movements as never)
    vi.mocked(prisma.stockItem.findMany).mockResolvedValue([
      { id: 'item-a', name: 'Item A', quantity: 10, unitPrice: 80, unit: 'un' },
      { id: 'item-b', name: 'Item B', quantity: 5, unitPrice: 30, unit: 'un' },
      { id: 'item-c', name: 'Item C', quantity: 2, unitPrice: 25, unit: 'un' },
    ] as never)

    const req = makeRequest('http://localhost/api/stock/analytics?period=MONTHLY')
    const res = await analyticsGET(req)

    expect(res.status).toBe(200)
    const body = await res.json() as {
      abcItems: { id: string; name: string; abcClass: string }[]
      abcDistribution: { A: number; B: number; C: number }
    }

    const itemA = body.abcItems.find(i => i.name === 'Item A')
    const itemB = body.abcItems.find(i => i.name === 'Item B')
    const itemC = body.abcItems.find(i => i.name === 'Item C')

    expect(itemA?.abcClass).toBe('A')
    expect(itemB?.abcClass).toBe('B')
    expect(itemC?.abcClass).toBe('C')

    expect(body.abcDistribution.A).toBe(1)
    expect(body.abcDistribution.B).toBe(1)
    expect(body.abcDistribution.C).toBe(1)
  })

  it('todos os itens são Classe A quando apenas um item existe', async () => {
    const movements = [
      { id: 'mv-only', itemId: 'item-only', quantity: 100, value: 1000, occurredAt: now, item: { id: 'item-only', name: 'Único Item', unit: 'un' } },
    ]
    vi.mocked(prisma.stockMovement.findMany).mockResolvedValue(movements as never)
    vi.mocked(prisma.stockItem.findMany).mockResolvedValue([
      { id: 'item-only', name: 'Único Item', quantity: 100, unitPrice: 10, unit: 'un' },
    ] as never)

    const req = makeRequest('http://localhost/api/stock/analytics?period=MONTHLY')
    const res = await analyticsGET(req)
    const body = await res.json() as { abcItems: { abcClass: string }[]; abcDistribution: { A: number } }

    expect(body.abcItems[0]?.abcClass).toBe('A')
    expect(body.abcDistribution.A).toBe(1)
  })
})

// ─── Period Filtering ──────────────────────────────────────────────────────────

describe('Filtro por período — WEEKLY vs MONTHLY', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.stockItem.findMany).mockResolvedValue(mockAllItems as never)
    vi.mocked(prisma.stockItem.update).mockResolvedValue({} as never)
  })

  it('período WEEKLY passa intervalo de 7 dias ao findMany', async () => {
    vi.mocked(prisma.stockMovement.findMany).mockResolvedValue([] as never)

    const req = makeRequest('http://localhost/api/stock/analytics?period=WEEKLY')
    const res = await analyticsGET(req)

    expect(res.status).toBe(200)
    const body = await res.json() as { period: string }
    expect(body.period).toBe('WEEKLY')

    const callArgs = vi.mocked(prisma.stockMovement.findMany).mock.calls[0][0] as {
      where: { occurredAt: { gte: Date; lte: Date } }
    }
    const { gte, lte } = callArgs.where.occurredAt
    const diffMs = lte.getTime() - gte.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeCloseTo(7, 0)
  })

  it('período MONTHLY passa intervalo de ~30 dias ao findMany', async () => {
    vi.mocked(prisma.stockMovement.findMany).mockResolvedValue([] as never)

    const req = makeRequest('http://localhost/api/stock/analytics?period=MONTHLY')
    const res = await analyticsGET(req)

    expect(res.status).toBe(200)

    const callArgs = vi.mocked(prisma.stockMovement.findMany).mock.calls[0][0] as {
      where: { occurredAt: { gte: Date; lte: Date } }
    }
    const { gte, lte } = callArgs.where.occurredAt
    const diffMs = lte.getTime() - gte.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    // Monthly diff is ~28-31 days
    expect(diffDays).toBeGreaterThan(27)
    expect(diffDays).toBeLessThan(32)
  })

  it('WEEKLY usa intervalo menor que MONTHLY', async () => {
    vi.mocked(prisma.stockMovement.findMany).mockResolvedValue([] as never)

    const reqWeekly = makeRequest('http://localhost/api/stock/analytics?period=WEEKLY')
    await analyticsGET(reqWeekly)
    const weeklyCall = vi.mocked(prisma.stockMovement.findMany).mock.calls[0][0] as {
      where: { occurredAt: { gte: Date; lte: Date } }
    }
    const weeklyDiff = weeklyCall.where.occurredAt.lte.getTime() - weeklyCall.where.occurredAt.gte.getTime()

    vi.mocked(prisma.stockMovement.findMany).mockClear()

    const reqMonthly = makeRequest('http://localhost/api/stock/analytics?period=MONTHLY')
    await analyticsGET(reqMonthly)
    const monthlyCall = vi.mocked(prisma.stockMovement.findMany).mock.calls[0][0] as {
      where: { occurredAt: { gte: Date; lte: Date } }
    }
    const monthlyDiff = monthlyCall.where.occurredAt.lte.getTime() - monthlyCall.where.occurredAt.gte.getTime()

    expect(weeklyDiff).toBeLessThan(monthlyDiff)
  })
})
