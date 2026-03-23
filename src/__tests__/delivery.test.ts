import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    order: { findUnique: vi.fn() },
    deliveryRecord: { create: vi.fn() },
    nonConformity: { create: vi.fn() },
    orderTimeline: { create: vi.fn() },
  },
}))

vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}))

vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('resized')),
  })),
}))

import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { POST as confirmDeliveryPOST } from '@/app/api/orders/[id]/confirm-delivery/route'
import { POST as nonConformityPOST } from '@/app/api/orders/[id]/non-conformities/route'

const managerUser = {
  id: 'user-1',
  email: 'manager@test.com',
  role: 'MAIN_MANAGER',
  fullName: 'Manager',
  secretaryId: null,
  passwordHash: 'hash',
}

const mockOrder = {
  id: 'order-1',
  code: 'OS-2026-0001',
  status: 'APPROVED',
}

const mockDeliveryRecord = {
  id: 'delivery-1',
  orderId: 'order-1',
  images: [],
  receivedByUserId: 'user-1',
  receivedAt: new Date(),
  observations: null,
}

const mockNonConformity = {
  id: 'nc-1',
  orderId: 'order-1',
  images: [],
  registeredByUserId: 'user-1',
  registeredAt: new Date(),
  observations: 'Produto avariado',
}

function makeMultipartRequest(url: string, fields: Record<string, string>): NextRequest {
  const body = new URLSearchParams(fields).toString()
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer valid.token',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
}

// ============================================================
// POST /api/orders/:id/confirm-delivery
// ============================================================

describe('POST /api/orders/:id/confirm-delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(managerUser as never)
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as never)
    vi.mocked(prisma.deliveryRecord.create).mockResolvedValue(mockDeliveryRecord as never)
    vi.mocked(prisma.orderTimeline.create).mockResolvedValue({
      id: 'timeline-1',
      orderId: 'order-1',
      step: 'DELIVERED',
      userId: 'user-1',
      occurredAt: new Date(),
    } as never)
  })

  it('retorna 401 sem autenticação', async () => {
    vi.mocked(verifyToken).mockRejectedValue(new Error('invalid token'))
    const req = new NextRequest('http://localhost/api/orders/order-1/confirm-delivery', {
      method: 'POST',
    })
    const res = await confirmDeliveryPOST(req, { params: { id: 'order-1' } })
    expect(res.status).toBe(401)
    const data = await res.json() as { error: string }
    expect(data.error).toContain('autenticado')
  })

  it('retorna 201 sem fotos quando observations está presente', async () => {
    const req = makeMultipartRequest(
      'http://localhost/api/orders/order-1/confirm-delivery',
      { observations: 'Entrega realizada com sucesso' }
    )
    const res = await confirmDeliveryPOST(req, { params: { id: 'order-1' } })
    expect(res.status).toBe(201)
    expect(prisma.deliveryRecord.create).toHaveBeenCalledOnce()
    expect(prisma.orderTimeline.create).toHaveBeenCalledOnce()
  })

  it('retorna 201 sem observations (campo opcional)', async () => {
    const req = makeMultipartRequest(
      'http://localhost/api/orders/order-1/confirm-delivery',
      {}
    )
    const res = await confirmDeliveryPOST(req, { params: { id: 'order-1' } })
    expect(res.status).toBe(201)
    expect(prisma.deliveryRecord.create).toHaveBeenCalledOnce()
  })

  it('retorna 403 para AUDIT_VIEWER', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...managerUser,
      role: 'AUDIT_VIEWER',
    } as never)
    const req = makeMultipartRequest(
      'http://localhost/api/orders/order-1/confirm-delivery',
      { observations: 'obs' }
    )
    const res = await confirmDeliveryPOST(req, { params: { id: 'order-1' } })
    expect(res.status).toBe(403)
  })

  it('retorna 404 se ordem não encontrada', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null)
    const req = makeMultipartRequest(
      'http://localhost/api/orders/nonexistent/confirm-delivery',
      { observations: 'obs' }
    )
    const res = await confirmDeliveryPOST(req, { params: { id: 'nonexistent' } })
    expect(res.status).toBe(404)
  })

  it('cria DeliveryRecord com images=[] quando sem fotos', async () => {
    const req = makeMultipartRequest(
      'http://localhost/api/orders/order-1/confirm-delivery',
      { observations: 'Sem fotos' }
    )
    await confirmDeliveryPOST(req, { params: { id: 'order-1' } })
    const createCall = vi.mocked(prisma.deliveryRecord.create).mock.calls[0][0]
    expect(createCall.data.images).toEqual([])
  })
})

// ============================================================
// POST /api/orders/:id/non-conformities
// ============================================================

describe('POST /api/orders/:id/non-conformities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(managerUser as never)
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as never)
    vi.mocked(prisma.nonConformity.create).mockResolvedValue(mockNonConformity as never)
  })

  it('retorna 401 sem autenticação', async () => {
    vi.mocked(verifyToken).mockRejectedValue(new Error('invalid token'))
    const req = new NextRequest('http://localhost/api/orders/order-1/non-conformities', {
      method: 'POST',
    })
    const res = await nonConformityPOST(req, { params: { id: 'order-1' } })
    expect(res.status).toBe(401)
    const data = await res.json() as { error: string }
    expect(data.error).toContain('autenticado')
  })

  it('retorna 422 se observations está vazio', async () => {
    const req = makeMultipartRequest(
      'http://localhost/api/orders/order-1/non-conformities',
      { observations: '' }
    )
    const res = await nonConformityPOST(req, { params: { id: 'order-1' } })
    expect(res.status).toBe(422)
    const data = await res.json() as { error: string }
    expect(data.error).toContain('observations')
  })

  it('retorna 422 se observations ausente', async () => {
    const req = makeMultipartRequest(
      'http://localhost/api/orders/order-1/non-conformities',
      {}
    )
    const res = await nonConformityPOST(req, { params: { id: 'order-1' } })
    expect(res.status).toBe(422)
  })

  it('retorna 201 com dados válidos', async () => {
    const req = makeMultipartRequest(
      'http://localhost/api/orders/order-1/non-conformities',
      { observations: 'Produto chegou avariado' }
    )
    const res = await nonConformityPOST(req, { params: { id: 'order-1' } })
    expect(res.status).toBe(201)
    expect(prisma.nonConformity.create).toHaveBeenCalledOnce()
    const data = await res.json() as typeof mockNonConformity
    expect(data.id).toBe('nc-1')
  })

  it('retorna 403 para AUDIT_VIEWER', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...managerUser,
      role: 'AUDIT_VIEWER',
    } as never)
    const req = makeMultipartRequest(
      'http://localhost/api/orders/order-1/non-conformities',
      { observations: 'Produto avariado' }
    )
    const res = await nonConformityPOST(req, { params: { id: 'order-1' } })
    expect(res.status).toBe(403)
  })

  it('cria NonConformity com images=[] quando sem fotos', async () => {
    const req = makeMultipartRequest(
      'http://localhost/api/orders/order-1/non-conformities',
      { observations: 'Produto avariado' }
    )
    await nonConformityPOST(req, { params: { id: 'order-1' } })
    const createCall = vi.mocked(prisma.nonConformity.create).mock.calls[0][0]
    expect(createCall.data.images).toEqual([])
  })
})
