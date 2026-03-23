import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), count: vi.fn(), create: vi.fn() },
    orderItem: { createMany: vi.fn() },
    orderTimeline: { create: vi.fn() },
    deliveryLocation: { createMany: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { GET as listOrdersGET, POST as createOrderPOST } from '@/app/api/orders/route'

const managerUser = {
  id: 'user-1',
  email: 'manager@test.com',
  role: 'MAIN_MANAGER',
  fullName: 'Manager',
  secretaryId: null,
  passwordHash: 'hash',
}

const auditUser = {
  ...managerUser,
  id: 'audit-1',
  role: 'AUDIT_VIEWER',
}

function makeRequest(method: string, body: unknown, url = 'http://localhost/api/orders'): NextRequest {
  return new NextRequest(url, {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid.token' },
  })
}

const validOrderBody = {
  name: 'Aquisição de material de escritório',
  category: 'MATERIAL',
  secretaryId: 'sec-1',
  investmentArea: 'Educação',
  receiverName: 'João Silva',
  items: [
    { name: 'Papel A4', unit: 'resma', quantity: 10, referenceValue: 25.90 },
  ],
  deliveryLocations: [
    { name: 'Sede', zipCode: '39600000', address: 'Rua Principal, 100', city: 'Araçuaí', state: 'MG' },
  ],
}

describe('GET /api/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(managerUser as never)
    vi.mocked(prisma.order.findMany).mockResolvedValue([])
    vi.mocked(prisma.order.count).mockResolvedValue(0)
  })

  it('retorna 200 para MAIN_MANAGER', async () => {
    const req = new NextRequest('http://localhost/api/orders', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await listOrdersGET(req)
    expect(res.status).toBe(200)
    const data = await res.json() as { data: unknown[] }
    expect(Array.isArray(data.data)).toBe(true)
  })

  it('retorna 403 para AUDIT_VIEWER', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(auditUser as never)
    const req = new NextRequest('http://localhost/api/orders', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await listOrdersGET(req)
    expect(res.status).toBe(403)
    const data = await res.json() as { error: string }
    expect(data.error).toContain('Acesso não autorizado')
  })

  it('retorna 401 sem autenticação', async () => {
    vi.mocked(verifyToken).mockRejectedValue(new Error('invalid'))
    const req = new NextRequest('http://localhost/api/orders')
    const res = await listOrdersGET(req)
    expect(res.status).toBe(401)
  })
})

describe('POST /api/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(managerUser as never)
    vi.mocked(prisma.order.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.order.create).mockResolvedValue({
      id: 'order-1',
      code: 'OS-2026-0001',
      name: 'Aquisição de material de escritório',
      category: 'MATERIAL',
      status: 'DRAFT',
      secretaryId: 'sec-1',
      investmentArea: 'Educação',
      receiverName: 'João Silva',
      createdByUserId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)
    vi.mocked(prisma.orderItem.createMany).mockResolvedValue({ count: 1 })
    vi.mocked(prisma.deliveryLocation.createMany).mockResolvedValue({ count: 1 })
    vi.mocked(prisma.orderTimeline.create).mockResolvedValue({
      id: 'timeline-1',
      orderId: 'order-1',
      step: 'CREATED',
      userId: 'user-1',
      occurredAt: new Date(),
    } as never)
  })

  it('retorna 201 para criação válida', async () => {
    const req = makeRequest('POST', validOrderBody)
    const res = await createOrderPOST(req)
    expect(res.status).toBe(201)
    expect(prisma.order.create).toHaveBeenCalledOnce()
    expect(prisma.orderItem.createMany).toHaveBeenCalledOnce()
    expect(prisma.deliveryLocation.createMany).toHaveBeenCalledOnce()
    expect(prisma.orderTimeline.create).toHaveBeenCalledOnce()
  })

  it('gera código no formato OS-YYYY-NNNN', async () => {
    const req = makeRequest('POST', validOrderBody)
    await createOrderPOST(req)
    const createCall = vi.mocked(prisma.order.create).mock.calls[0][0]
    expect(createCall.data.code).toMatch(/^OS-\d{4}-\d{4}$/)
  })

  it('incrementa sequencial quando já existe ordem no ano', async () => {
    vi.mocked(prisma.order.findFirst).mockResolvedValue({
      id: 'prev-order',
      code: 'OS-2026-0005',
    } as never)
    const req = makeRequest('POST', validOrderBody)
    await createOrderPOST(req)
    const createCall = vi.mocked(prisma.order.create).mock.calls[0][0]
    expect(createCall.data.code).toBe('OS-2026-0006')
  })

  it('retorna 422 se campos obrigatórios faltando', async () => {
    const req = makeRequest('POST', { name: 'Apenas nome' })
    const res = await createOrderPOST(req)
    expect(res.status).toBe(422)
    const data = await res.json() as { error: string }
    expect(data.error).toContain('obrigatórios')
  })

  it('retorna 422 se items vazios', async () => {
    const req = makeRequest('POST', {
      ...validOrderBody,
      items: [],
    })
    const res = await createOrderPOST(req)
    expect(res.status).toBe(422)
  })

  it('retorna 422 se deliveryLocations vazio', async () => {
    const req = makeRequest('POST', {
      ...validOrderBody,
      deliveryLocations: [],
    })
    const res = await createOrderPOST(req)
    expect(res.status).toBe(422)
  })

  it('retorna 403 para SECRETARY_USER tentando criar', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...managerUser,
      role: 'SECRETARY_USER',
    } as never)
    const req = makeRequest('POST', validOrderBody)
    const res = await createOrderPOST(req)
    expect(res.status).toBe(403)
  })
})
