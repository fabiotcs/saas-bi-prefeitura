import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    biometricRecord: {
      create: vi.fn(),
    },
  },
}))

// Mock jwt
vi.mock('@/lib/jwt', () => ({
  signToken: vi.fn().mockResolvedValue('mocked.jwt.token'),
  verifyToken: vi.fn().mockResolvedValue({ userId: 'user-1', type: 'refresh' }),
}))

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
  compare: vi.fn(),
  hash: vi.fn(),
}))

// Mock biometric-provider
vi.mock('@/lib/biometric-provider', () => ({
  getBiometricProvider: vi.fn(() => ({
    verify: vi.fn().mockResolvedValue({
      match: true,
      similarityScore: 0.95,
      livenessScore: 0.98,
      confidenceLevel: 0.97,
      fraudAlertLevel: 'NONE',
      aiEstimatedAge: 35,
    }),
  })),
}))

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { POST as loginPOST } from '@/app/api/auth/login/route'
import { POST as refreshPOST } from '@/app/api/auth/refresh/route'

const mockUser = {
  id: 'user-1',
  email: 'admin@aracuai.mg.gov.br',
  passwordHash: '$2b$12$hashedpassword',
  fullName: 'Administrador',
  role: 'MAIN_MANAGER',
  photoUrl: null,
  biometricVerified: false,
  documentVerified: false,
}

function makeRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never)
  })

  it('retorna challengeToken com credenciais válidas', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const req = makeRequest({ email: 'admin@aracuai.mg.gov.br', password: 'admin123' })
    const res = await loginPOST(req)
    const data = await res.json() as { challengeToken?: string }

    expect(res.status).toBe(200)
    expect(data.challengeToken).toBeDefined()
    expect(typeof data.challengeToken).toBe('string')
  })

  it('retorna 401 com senha inválida', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

    const req = makeRequest({ email: 'admin@aracuai.mg.gov.br', password: 'wrongpassword' })
    const res = await loginPOST(req)

    expect(res.status).toBe(401)
  })

  it('retorna 401 com usuário não encontrado', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

    const req = makeRequest({ email: 'naoexiste@test.com', password: 'qualquer' })
    const res = await loginPOST(req)

    expect(res.status).toBe(401)
  })

  it('retorna 400 quando email ou senha estão ausentes', async () => {
    const req = makeRequest({ email: 'admin@test.com' })
    const res = await loginPOST(req)

    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 400 sem refreshToken', async () => {
    const req = new NextRequest('http://localhost/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await refreshPOST(req)
    expect(res.status).toBe(400)
  })

  it('retorna 401 para refreshToken inválido', async () => {
    const req = new NextRequest('http://localhost/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: 'token.invalido.qualquer' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await refreshPOST(req)
    expect(res.status).toBe(401)
  })
})
