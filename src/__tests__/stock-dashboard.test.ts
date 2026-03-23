import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    stockItem: { findMany: vi.fn(), count: vi.fn() },
  },
}))

vi.mock('@/lib/jwt', () => ({ verifyToken: vi.fn() }))

import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { GET as dashboardGET } from '@/app/api/stock/dashboard/route'
import { GET as inventoryGET } from '@/app/api/stock/inventory/route'

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

const mockStockItems = [
  { quantity: 100, unitPrice: 10.0, minimumAlert: 20 },
  { quantity: 5, unitPrice: 50.0, minimumAlert: 10 },
  { quantity: 0, unitPrice: 5.0, minimumAlert: 5 },
]

const mockInventoryItems = [
  {
    id: 'item-1',
    name: 'Caneta BIC',
    imageUrl: null,
    quantity: 100,
    unit: 'un',
    unitPrice: 1.5,
    minimumAlert: 20,
    barcode: '7891010000001',
    qrCode: null,
    storageLocationId: 'loc-1',
    storageLocation: { id: 'loc-1', name: 'Almoxarifado Central' },
    abcClass: 'A',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-2',
    name: 'Papel A4',
    imageUrl: null,
    quantity: 5,
    unit: 'resma',
    unitPrice: 25.0,
    minimumAlert: 10,
    barcode: null,
    qrCode: null,
    storageLocationId: null,
    storageLocation: null,
    abcClass: 'B',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// ─── GET /api/stock/dashboard ─────────────────────────────────────────────────

describe('GET /api/stock/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.stockItem.findMany).mockResolvedValue(mockStockItems as never)
  })

  it('retorna 200 com 4 indicadores para MAIN_MANAGER', async () => {
    const req = makeRequest('http://localhost/api/stock/dashboard')
    const res = await dashboardGET(req)

    expect(res.status).toBe(200)

    const body = await res.json() as {
      totalProducts: number
      totalItems: number
      totalValue: number
      lowStockItems: number
    }

    expect(body).toHaveProperty('totalProducts')
    expect(body).toHaveProperty('totalItems')
    expect(body).toHaveProperty('totalValue')
    expect(body).toHaveProperty('lowStockItems')

    // 3 items in mock
    expect(body.totalProducts).toBe(3)
    // 100 + 5 + 0
    expect(body.totalItems).toBe(105)
    // 100*10 + 5*50 + 0*5 = 1250
    expect(body.totalValue).toBe(1250)
    // qty(5) <= alert(10) and qty(0) <= alert(5) → 2
    expect(body.lowStockItems).toBe(2)
  })

  it('retorna 401 sem autenticação', async () => {
    const req = new NextRequest('http://localhost/api/stock/dashboard', {
      method: 'GET',
      // No Authorization header
    })
    const res = await dashboardGET(req)
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/stock/inventory ─────────────────────────────────────────────────

describe('GET /api/stock/inventory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.stockItem.findMany).mockResolvedValue(mockInventoryItems as never)
    vi.mocked(prisma.stockItem.count).mockResolvedValue(2)
  })

  it('retorna 200 com lista paginada', async () => {
    const req = makeRequest('http://localhost/api/stock/inventory?page=1&limit=20')
    const res = await inventoryGET(req)

    expect(res.status).toBe(200)

    const body = await res.json() as {
      data: unknown[]
      total: number
      page: number
      limit: number
    }

    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data).toHaveLength(2)
    expect(body.total).toBe(2)
    expect(body.page).toBe(1)
    expect(body.limit).toBe(20)
  })

  it('filtra por search (nome)', async () => {
    vi.mocked(prisma.stockItem.findMany).mockResolvedValue([mockInventoryItems[0]] as never)
    vi.mocked(prisma.stockItem.count).mockResolvedValue(1)

    const req = makeRequest('http://localhost/api/stock/inventory?search=Caneta')
    const res = await inventoryGET(req)

    expect(res.status).toBe(200)

    const body = await res.json() as { data: unknown[]; total: number }

    expect(body.data).toHaveLength(1)
    expect(body.total).toBe(1)

    // Verify prisma was called with name filter
    expect(prisma.stockItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: expect.objectContaining({ contains: 'Caneta', mode: 'insensitive' }),
        }),
      }),
    )
  })
})
