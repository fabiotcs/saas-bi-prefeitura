import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    stockItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    stockMovement: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/jwt', () => ({ verifyToken: vi.fn() }))

import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { GET as listItemsGET, POST as createItemPOST } from '@/app/api/stock/items/route'
import { GET as getItemGET, PATCH as updateItemPATCH } from '@/app/api/stock/items/[id]/route'
import { GET as listMovementsGET, POST as createMovementPOST } from '@/app/api/stock/movements/route'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mainManager = {
  id: 'user-1',
  email: 'admin@test.com',
  role: 'MAIN_MANAGER',
  fullName: 'Admin',
  secretaryId: null,
  passwordHash: 'hash',
}

const secretaryUser = {
  ...mainManager,
  id: 'user-2',
  role: 'SECRETARY_USER',
}

const mockItem = {
  id: 'item-1',
  name: 'Caneta BIC Azul',
  unit: 'un',
  unitPrice: 2.5,
  quantity: 100,
  minimumAlert: 20,
  barcode: '7891010000001',
  qrCode: null,
  imageUrl: null,
  storageLocationId: 'loc-1',
  storageLocation: { id: 'loc-1', name: 'Almoxarifado Central' },
  abcClass: 'A',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockItemWithMovements = {
  ...mockItem,
  movements: [
    {
      id: 'mov-1',
      type: 'IN',
      quantity: 100,
      value: 250,
      notes: null,
      occurredAt: new Date(),
      user: { id: 'user-1', fullName: 'Admin', photoUrl: null },
    },
  ],
}

const mockMovement = {
  id: 'mov-1',
  type: 'IN',
  itemId: 'item-1',
  quantity: 10,
  value: 25,
  notes: null,
  userId: 'user-1',
  targetLocationId: null,
  occurredAt: new Date(),
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(method: string, body?: unknown, url = 'http://localhost/api/stock/items'): NextRequest {
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid.token' },
  })
}

function makeIdRequest(method: string, id: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/stock/items/${id}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid.token' },
  })
}

// ─── GET /api/stock/items ─────────────────────────────────────────────────────

describe('GET /api/stock/items', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.stockItem.findMany).mockResolvedValue([mockItem] as never)
    vi.mocked(prisma.stockItem.count).mockResolvedValue(1)
  })

  it('retorna 200 com paginação para usuário autenticado', async () => {
    const req = makeRequest('GET', undefined, 'http://localhost/api/stock/items?page=1&limit=20')
    const res = await listItemsGET(req)
    expect(res.status).toBe(200)
    const data = await res.json() as { data: unknown[]; total: number; page: number; limit: number }
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.total).toBe(1)
    expect(data.page).toBe(1)
    expect(data.limit).toBe(20)
  })

  it('retorna 401 sem autenticação', async () => {
    vi.mocked(verifyToken).mockRejectedValue(new Error('invalid'))
    const req = new NextRequest('http://localhost/api/stock/items')
    const res = await listItemsGET(req)
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/stock/items ────────────────────────────────────────────────────

describe('POST /api/stock/items', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.stockItem.create).mockResolvedValue(mockItem as never)
  })

  it('retorna 201 para criação válida', async () => {
    const req = makeRequest('POST', { name: 'Caneta BIC Azul', unit: 'un', unitPrice: 2.5 })
    const res = await createItemPOST(req)
    expect(res.status).toBe(201)
    expect(prisma.stockItem.create).toHaveBeenCalledOnce()
  })

  it('retorna 422 se nome estiver faltando', async () => {
    const req = makeRequest('POST', { unit: 'un' })
    const res = await createItemPOST(req)
    expect(res.status).toBe(422)
    const data = await res.json() as { error: string }
    expect(data.error).toBeTruthy()
  })

  it('retorna 403 para SECRETARY_USER', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(secretaryUser as never)
    const req = makeRequest('POST', { name: 'Caneta', unit: 'un', unitPrice: 2.5 })
    const res = await createItemPOST(req)
    expect(res.status).toBe(403)
  })
})

// ─── GET /api/stock/items/[id] ────────────────────────────────────────────────

describe('GET /api/stock/items/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.stockItem.findUnique).mockResolvedValue(mockItemWithMovements as never)
  })

  it('retorna 200 com o item e movimentações', async () => {
    const req = makeIdRequest('GET', 'item-1')
    const res = await getItemGET(req, { params: { id: 'item-1' } })
    expect(res.status).toBe(200)
    const data = await res.json() as { id: string; movements: unknown[] }
    expect(data.id).toBe('item-1')
    expect(Array.isArray(data.movements)).toBe(true)
  })

  it('retorna 404 se item não encontrado', async () => {
    vi.mocked(prisma.stockItem.findUnique).mockResolvedValue(null)
    const req = makeIdRequest('GET', 'nonexistent')
    const res = await getItemGET(req, { params: { id: 'nonexistent' } })
    expect(res.status).toBe(404)
  })

  it('retorna 401 sem autenticação', async () => {
    vi.mocked(verifyToken).mockRejectedValue(new Error('invalid'))
    const req = new NextRequest('http://localhost/api/stock/items/item-1')
    const res = await getItemGET(req, { params: { id: 'item-1' } })
    expect(res.status).toBe(401)
  })
})

// ─── PATCH /api/stock/items/[id] ──────────────────────────────────────────────

describe('PATCH /api/stock/items/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.stockItem.update).mockResolvedValue({ ...mockItem, name: 'Caneta Atualizada' } as never)
  })

  it('retorna 200 com item atualizado', async () => {
    const req = makeIdRequest('PATCH', 'item-1', { name: 'Caneta Atualizada' })
    const res = await updateItemPATCH(req, { params: { id: 'item-1' } })
    expect(res.status).toBe(200)
    const data = await res.json() as { name: string }
    expect(data.name).toBe('Caneta Atualizada')
  })

  it('retorna 403 para SECRETARY_USER', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(secretaryUser as never)
    const req = makeIdRequest('PATCH', 'item-1', { name: 'Caneta' })
    const res = await updateItemPATCH(req, { params: { id: 'item-1' } })
    expect(res.status).toBe(403)
  })
})

// ─── GET /api/stock/movements ─────────────────────────────────────────────────

describe('GET /api/stock/movements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.stockMovement.findMany).mockResolvedValue([mockMovement] as never)
    vi.mocked(prisma.stockMovement.count).mockResolvedValue(1)
  })

  it('retorna 200 paginado para usuário autenticado', async () => {
    const req = new NextRequest('http://localhost/api/stock/movements?page=1&limit=20', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await listMovementsGET(req)
    expect(res.status).toBe(200)
    const data = await res.json() as { data: unknown[]; total: number }
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.total).toBe(1)
  })

  it('retorna 401 sem autenticação', async () => {
    vi.mocked(verifyToken).mockRejectedValue(new Error('invalid'))
    const req = new NextRequest('http://localhost/api/stock/movements')
    const res = await listMovementsGET(req)
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/stock/movements ────────────────────────────────────────────────

describe('POST /api/stock/movements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.stockItem.findUnique).mockResolvedValue(mockItem as never)
    vi.mocked(prisma.$transaction).mockResolvedValue([mockMovement] as never)
  })

  it('retorna 201 para movimentação IN válida', async () => {
    const req = makeRequest('POST', { type: 'IN', itemId: 'item-1', quantity: 10 }, 'http://localhost/api/stock/movements')
    const res = await createMovementPOST(req)
    expect(res.status).toBe(201)
    expect(prisma.$transaction).toHaveBeenCalledOnce()
  })

  it('retorna 422 para OUT com quantidade insuficiente', async () => {
    // quantity=100, trying to remove 200
    vi.mocked(prisma.stockItem.findUnique).mockResolvedValue({ ...mockItem, quantity: 5 } as never)
    const req = makeRequest('POST', { type: 'OUT', itemId: 'item-1', quantity: 200 }, 'http://localhost/api/stock/movements')
    const res = await createMovementPOST(req)
    expect(res.status).toBe(422)
    const data = await res.json() as { error: string }
    expect(data.error).toContain('insuficiente')
  })

  it('retorna 401 sem autenticação', async () => {
    vi.mocked(verifyToken).mockRejectedValue(new Error('invalid'))
    const req = new NextRequest('http://localhost/api/stock/movements', {
      method: 'POST',
      body: JSON.stringify({ type: 'IN', itemId: 'item-1', quantity: 10 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await createMovementPOST(req)
    expect(res.status).toBe(401)
  })
})
