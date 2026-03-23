import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    order: { findUnique: vi.fn(), update: vi.fn() },
    twoFactorRequest: { findUnique: vi.fn(), update: vi.fn() },
    orderTimeline: { create: vi.fn() },
  },
}))

vi.mock('@/lib/jwt', () => ({ verifyToken: vi.fn() }))

vi.mock('bcrypt', () => ({
  default: { compare: vi.fn() },
  compare: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import bcrypt from 'bcrypt'
import { POST as approveOrder } from '@/app/api/orders/[id]/approve/route'

// ---- Fixtures ----

const mainManagerUser = {
  id: 'user-1',
  email: 'manager@test.com',
  role: 'MAIN_MANAGER',
  fullName: 'Manager Principal',
  secretaryId: null,
  passwordHash: 'hash',
}

const secretaryManagerUser = {
  ...mainManagerUser,
  id: 'user-2',
  role: 'SECRETARY_MANAGER',
}

const secretaryUser = {
  ...mainManagerUser,
  id: 'user-3',
  role: 'SECRETARY_USER',
}

const mockOrder = {
  id: 'order-1',
  code: 'OS-2026-0001',
  name: 'Aquisição de material de escritório',
  category: 'MATERIAL',
  status: 'OPEN',
  secretaryId: 'sec-1',
  investmentArea: 'Educação',
  receiverName: 'João Silva',
  createdByUserId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockUpdatedOrder = {
  ...mockOrder,
  status: 'APPROVED',
  secretary: { id: 'sec-1', name: 'Secretaria de Educação' },
  subSecretary: null,
  createdBy: { id: 'user-1', fullName: 'Manager Principal', photoUrl: null },
  items: [],
  timeline: [],
  deliveryLocations: [],
  deliveryRecords: [],
  nonConformities: [],
  invoices: [],
}

const mockTwoFactorRequest = {
  id: 'tf-req-1',
  userId: 'user-1',
  action: 'APPROVE_ORDER',
  otpHash: '$2b$10$hashedOtp',
  expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min from now
  used: false,
  failCount: 0,
  blockedUntil: null,
  createdAt: new Date(),
}

// ---- Helpers ----

function makeRequest(
  body: unknown,
  orderId = 'order-1',
  withAuth = true
): NextRequest {
  return new NextRequest(`http://localhost/api/orders/${orderId}/approve`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(withAuth ? { Authorization: 'Bearer valid.token' } : {}),
    },
  })
}

// ---- Tests ----

describe('POST /api/orders/:id/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 401 sem autenticação', async () => {
    vi.mocked(verifyToken).mockRejectedValue(new Error('invalid token'))

    const req = makeRequest(
      { otpCode: '123456', twoFactorRequestId: 'tf-req-1' },
      'order-1',
      false
    )

    const res = await approveOrder(req, { params: { id: 'order-1' } })

    expect(res.status).toBe(401)
    const data = await res.json() as { error: string }
    expect(data.error).toContain('Não autenticado')
  })

  it('retorna 403 para SECRETARY_USER', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-3', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(secretaryUser as never)

    const req = makeRequest({ otpCode: '123456', twoFactorRequestId: 'tf-req-1' })

    const res = await approveOrder(req, { params: { id: 'order-1' } })

    expect(res.status).toBe(403)
    const data = await res.json() as { error: string }
    expect(data.error).toContain('Acesso não autorizado')
  })

  it('retorna 422 se 2FA inválido (OTP errado)', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManagerUser as never)
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as never)
    vi.mocked(prisma.twoFactorRequest.findUnique).mockResolvedValue(
      mockTwoFactorRequest as never
    )
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)
    vi.mocked(prisma.twoFactorRequest.update).mockResolvedValue({
      ...mockTwoFactorRequest,
      failCount: 1,
      blockedUntil: null,
    } as never)

    const req = makeRequest({ otpCode: '000000', twoFactorRequestId: 'tf-req-1' })

    const res = await approveOrder(req, { params: { id: 'order-1' } })

    expect(res.status).toBe(422)
    const data = await res.json() as { error: string; reason: string }
    expect(data.reason).toBe('invalid_code')
  })

  it('retorna 200 com order aprovada após 2FA válido', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManagerUser as never)
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as never)
    vi.mocked(prisma.twoFactorRequest.findUnique).mockResolvedValue(
      mockTwoFactorRequest as never
    )
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    vi.mocked(prisma.twoFactorRequest.update).mockResolvedValue({
      ...mockTwoFactorRequest,
      used: true,
    } as never)
    vi.mocked(prisma.order.update).mockResolvedValue(mockUpdatedOrder as never)
    vi.mocked(prisma.orderTimeline.create).mockResolvedValue({
      id: 'timeline-2',
      orderId: 'order-1',
      step: 'APPROVED',
      userId: 'user-1',
      occurredAt: new Date(),
    } as never)

    const req = makeRequest({ otpCode: '123456', twoFactorRequestId: 'tf-req-1' })

    const res = await approveOrder(req, { params: { id: 'order-1' } })

    expect(res.status).toBe(200)
    const data = await res.json() as { status: string }
    expect(data.status).toBe('APPROVED')

    expect(prisma.twoFactorRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tf-req-1' },
        data: { used: true },
      })
    )
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1' },
        data: expect.objectContaining({ status: 'APPROVED' }),
      })
    )
    expect(prisma.orderTimeline.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: 'order-1',
          step: 'APPROVED',
          userId: 'user-1',
        }),
      })
    )
  })

  it('retorna 422 se 2FA expirado', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManagerUser as never)
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as never)
    vi.mocked(prisma.twoFactorRequest.findUnique).mockResolvedValue({
      ...mockTwoFactorRequest,
      expiresAt: new Date(Date.now() - 1000), // already expired
    } as never)

    const req = makeRequest({ otpCode: '123456', twoFactorRequestId: 'tf-req-1' })

    const res = await approveOrder(req, { params: { id: 'order-1' } })

    expect(res.status).toBe(422)
    const data = await res.json() as { reason: string }
    expect(data.reason).toBe('expired')
  })

  it('retorna 422 se 2FA já usado', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManagerUser as never)
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as never)
    vi.mocked(prisma.twoFactorRequest.findUnique).mockResolvedValue({
      ...mockTwoFactorRequest,
      used: true,
    } as never)

    const req = makeRequest({ otpCode: '123456', twoFactorRequestId: 'tf-req-1' })

    const res = await approveOrder(req, { params: { id: 'order-1' } })

    expect(res.status).toBe(422)
    const data = await res.json() as { reason: string }
    expect(data.reason).toBe('already_used')
  })

  it('bloqueia após 3 falhas e retorna 422 com reason blocked', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManagerUser as never)
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as never)
    vi.mocked(prisma.twoFactorRequest.findUnique).mockResolvedValue({
      ...mockTwoFactorRequest,
      failCount: 2, // one more failure will trigger block
    } as never)
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)
    vi.mocked(prisma.twoFactorRequest.update).mockResolvedValue({
      ...mockTwoFactorRequest,
      failCount: 3,
      blockedUntil: new Date(Date.now() + 5 * 60 * 1000),
    } as never)

    const req = makeRequest({ otpCode: '000000', twoFactorRequestId: 'tf-req-1' })

    const res = await approveOrder(req, { params: { id: 'order-1' } })

    expect(res.status).toBe(422)
    const data = await res.json() as { reason: string; blockedUntil: string }
    expect(data.reason).toBe('blocked')
    expect(data.blockedUntil).toBeDefined()
  })

  it('retorna 403 para SECRETARY_MANAGER quando order não existe', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-2', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(secretaryManagerUser as never)
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null)

    const req = makeRequest({ otpCode: '123456', twoFactorRequestId: 'tf-req-1' }, 'nonexistent-id')

    const res = await approveOrder(req, { params: { id: 'nonexistent-id' } })

    expect(res.status).toBe(404)
  })
})
