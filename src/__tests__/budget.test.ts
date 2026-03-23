import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    budgetContract: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    budgetAdditive: { create: vi.fn() },
    budgetCommitment: { create: vi.fn() },
    twoFactorRequest: { findUnique: vi.fn(), update: vi.fn() },
    secretary: { update: vi.fn() },
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
import { GET as getContracts } from '@/app/api/budget/contracts/route'
import { POST as postAdditive } from '@/app/api/budget/contracts/[id]/additives/route'
import { POST as postCommitment } from '@/app/api/budget/contracts/[id]/commitments/route'

// ---- Fixtures ----

const mainManagerUser = {
  id: 'user-1',
  email: 'manager@test.com',
  role: 'MAIN_MANAGER',
  fullName: 'Gestor Principal',
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

const mockContract = {
  id: 'contract-1',
  contractNumber: '008/2026',
  initialValue: 100000,
  additivesTotal: 0,
  currentTotal: 100000,
  distributedToSecretaries: 0,
  allocatedViaCommitment: 20000,
  consumedInOrders: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockTwoFactorRequest = {
  id: 'tf-req-1',
  userId: 'user-1',
  action: 'SUBMIT_ADDITIVE',
  otpHash: '$2b$10$hashedOtp',
  expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  used: false,
  failCount: 0,
  blockedUntil: null,
  createdAt: new Date(),
}

const mockAdditive = {
  id: 'additive-1',
  contractId: 'contract-1',
  value: 10000,
  description: 'Aditivo de ampliação',
  approvedAt: new Date(),
  fileUrl: null,
  approvedById: 'user-1',
  approvedBy: { id: 'user-1', fullName: 'Gestor Principal' },
}

const mockCommitment = {
  id: 'commitment-1',
  contractId: 'contract-1',
  secretaryId: 'sec-1',
  value: 30000,
  usedValue: 0,
  status: 'ACTIVE',
  registeredAt: new Date(),
  fileUrl: null,
  registeredById: 'user-1',
  secretary: { id: 'sec-1', name: 'Secretaria de Educação' },
  registeredBy: { id: 'user-1', fullName: 'Gestor Principal' },
}

// ---- Helpers ----

function makeRequest(
  url: string,
  method: string,
  body?: unknown,
  withAuth = true
): NextRequest {
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...(withAuth ? { Authorization: 'Bearer valid.token' } : {}),
    },
  })
}

// ---- Tests: GET /api/budget/contracts ----

describe('GET /api/budget/contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 200 para MAIN_MANAGER', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManagerUser as never)
    vi.mocked(prisma.budgetContract.findMany).mockResolvedValue([mockContract] as never)

    const req = makeRequest('http://localhost/api/budget/contracts', 'GET')
    const res = await getContracts(req)

    expect(res.status).toBe(200)
    const data = await res.json() as { data: unknown[] }
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.data).toHaveLength(1)
  })

  it('retorna 403 para SECRETARY_USER', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-3', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(secretaryUser as never)

    const req = makeRequest('http://localhost/api/budget/contracts', 'GET')
    const res = await getContracts(req)

    expect(res.status).toBe(403)
    const data = await res.json() as { error: string }
    expect(data.error).toContain('Acesso não autorizado')
  })

  it('retorna 401 sem autenticação', async () => {
    vi.mocked(verifyToken).mockRejectedValue(new Error('invalid token'))

    const req = makeRequest('http://localhost/api/budget/contracts', 'GET', undefined, false)
    const res = await getContracts(req)

    expect(res.status).toBe(401)
  })
})

// ---- Tests: POST /api/budget/contracts/:id/additives ----

describe('POST /api/budget/contracts/:id/additives', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 422 sem 2FA válido (OTP inválido)', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManagerUser as never)
    vi.mocked(prisma.budgetContract.findUnique).mockResolvedValue(mockContract as never)
    vi.mocked(prisma.twoFactorRequest.findUnique).mockResolvedValue(
      mockTwoFactorRequest as never
    )
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)
    vi.mocked(prisma.twoFactorRequest.update).mockResolvedValue({
      ...mockTwoFactorRequest,
      failCount: 1,
      blockedUntil: null,
    } as never)

    const req = makeRequest(
      'http://localhost/api/budget/contracts/contract-1/additives',
      'POST',
      {
        value: 10000,
        description: 'Aditivo de teste',
        otpCode: '000000',
        twoFactorRequestId: 'tf-req-1',
      }
    )

    const res = await postAdditive(req, { params: { id: 'contract-1' } })

    expect(res.status).toBe(422)
    const data = await res.json() as { reason: string }
    expect(data.reason).toBe('invalid_code')
  })

  it('retorna 201 após 2FA válido', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManagerUser as never)
    vi.mocked(prisma.budgetContract.findUnique).mockResolvedValue(mockContract as never)
    vi.mocked(prisma.twoFactorRequest.findUnique).mockResolvedValue(
      mockTwoFactorRequest as never
    )
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    vi.mocked(prisma.twoFactorRequest.update).mockResolvedValue({
      ...mockTwoFactorRequest,
      used: true,
    } as never)
    vi.mocked(prisma.budgetAdditive.create).mockResolvedValue(mockAdditive as never)
    vi.mocked(prisma.budgetContract.update).mockResolvedValue({
      ...mockContract,
      additivesTotal: 10000,
      currentTotal: 110000,
    } as never)

    const req = makeRequest(
      'http://localhost/api/budget/contracts/contract-1/additives',
      'POST',
      {
        value: 10000,
        description: 'Aditivo de ampliação',
        otpCode: '123456',
        twoFactorRequestId: 'tf-req-1',
      }
    )

    const res = await postAdditive(req, { params: { id: 'contract-1' } })

    expect(res.status).toBe(201)
    const data = await res.json() as { id: string; value: number }
    expect(data.id).toBe('additive-1')
    expect(data.value).toBe(10000)
    expect(prisma.twoFactorRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { used: true } })
    )
    expect(prisma.budgetContract.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'contract-1' },
        data: {
          additivesTotal: { increment: 10000 },
          currentTotal: { increment: 10000 },
        },
      })
    )
  })

  it('retorna 403 para SECRETARY_MANAGER', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-2', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(secretaryManagerUser as never)

    const req = makeRequest(
      'http://localhost/api/budget/contracts/contract-1/additives',
      'POST',
      { value: 5000, description: 'Teste', otpCode: '123456', twoFactorRequestId: 'tf-1' }
    )

    const res = await postAdditive(req, { params: { id: 'contract-1' } })

    expect(res.status).toBe(403)
  })
})

// ---- Tests: POST /api/budget/contracts/:id/commitments ----

describe('POST /api/budget/contracts/:id/commitments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 422 se saldo insuficiente', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManagerUser as never)
    // contract has currentTotal=100000, allocatedViaCommitment=20000 → available=80000
    vi.mocked(prisma.budgetContract.findUnique).mockResolvedValue(mockContract as never)

    const req = makeRequest(
      'http://localhost/api/budget/contracts/contract-1/commitments',
      'POST',
      {
        secretaryId: 'sec-1',
        value: 90000, // exceeds available balance of 80000
        otpCode: '123456',
        twoFactorRequestId: 'tf-req-1',
      }
    )

    const res = await postCommitment(req, { params: { id: 'contract-1' } })

    expect(res.status).toBe(422)
    const data = await res.json() as { reason: string; available: number }
    expect(data.reason).toBe('insufficient_balance')
    expect(data.available).toBe(80000)
  })

  it('retorna 201 com saldo suficiente', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManagerUser as never)
    vi.mocked(prisma.budgetContract.findUnique).mockResolvedValue(mockContract as never)
    vi.mocked(prisma.twoFactorRequest.findUnique).mockResolvedValue(
      { ...mockTwoFactorRequest, action: 'SUBMIT_COMMITMENT' } as never
    )
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    vi.mocked(prisma.twoFactorRequest.update).mockResolvedValue({
      ...mockTwoFactorRequest,
      used: true,
    } as never)
    vi.mocked(prisma.budgetCommitment.create).mockResolvedValue(mockCommitment as never)
    vi.mocked(prisma.budgetContract.update).mockResolvedValue({
      ...mockContract,
      allocatedViaCommitment: 50000,
    } as never)
    vi.mocked(prisma.secretary.update).mockResolvedValue({ id: 'sec-1' } as never)

    const req = makeRequest(
      'http://localhost/api/budget/contracts/contract-1/commitments',
      'POST',
      {
        secretaryId: 'sec-1',
        value: 30000,
        otpCode: '123456',
        twoFactorRequestId: 'tf-req-1',
      }
    )

    const res = await postCommitment(req, { params: { id: 'contract-1' } })

    expect(res.status).toBe(201)
    const data = await res.json() as { id: string; value: number; status: string }
    expect(data.id).toBe('commitment-1')
    expect(data.value).toBe(30000)
    expect(data.status).toBe('ACTIVE')
    expect(prisma.budgetContract.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'contract-1' },
        data: { allocatedViaCommitment: { increment: 30000 } },
      })
    )
    expect(prisma.secretary.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sec-1' },
        data: { budgetAllocated: { increment: 30000 } },
      })
    )
  })

  it('retorna 422 se 2FA inválido no empenho', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManagerUser as never)
    vi.mocked(prisma.budgetContract.findUnique).mockResolvedValue(mockContract as never)
    vi.mocked(prisma.twoFactorRequest.findUnique).mockResolvedValue(
      { ...mockTwoFactorRequest, action: 'SUBMIT_COMMITMENT' } as never
    )
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)
    vi.mocked(prisma.twoFactorRequest.update).mockResolvedValue({
      ...mockTwoFactorRequest,
      failCount: 1,
      blockedUntil: null,
    } as never)

    const req = makeRequest(
      'http://localhost/api/budget/contracts/contract-1/commitments',
      'POST',
      {
        secretaryId: 'sec-1',
        value: 30000,
        otpCode: '000000',
        twoFactorRequestId: 'tf-req-1',
      }
    )

    const res = await postCommitment(req, { params: { id: 'contract-1' } })

    expect(res.status).toBe(422)
    const data = await res.json() as { reason: string }
    expect(data.reason).toBe('invalid_code')
  })
})
