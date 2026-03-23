import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  assessLivenessFromBuffer,
  calculateFraudAlertLevel,
  MockBiometricProvider,
} from '@/lib/biometric-provider'
import { NextRequest } from 'next/server'

// ─── Unit tests: liveness e fraud alert level ───────────────────────────────

describe('assessLivenessFromBuffer', () => {
  it('retorna 0 para buffer vazio', () => {
    expect(assessLivenessFromBuffer(Buffer.alloc(0))).toBe(0)
  })

  it('retorna score baixo para imagem com pixels uniformes (foto impressa)', () => {
    // Buffer uniforme = foto plana → variância próxima de 0
    const uniformBuffer = Buffer.alloc(4096, 128)
    const score = assessLivenessFromBuffer(uniformBuffer)
    expect(score).toBe(0) // variância 0, normalizado para 0
  })

  it('retorna score alto para imagem com alta variância (face real)', () => {
    // Buffer com alternância máxima de pixels
    const noisyBuffer = Buffer.from(
      Array.from({ length: 4096 }, (_, i) => (i % 2 === 0 ? 0 : 255))
    )
    const score = assessLivenessFromBuffer(noisyBuffer)
    expect(score).toBeGreaterThan(50)
  })
})

describe('calculateFraudAlertLevel', () => {
  it('retorna HIGH quando livenessScore < 40', () => {
    expect(calculateFraudAlertLevel(30, 80)).toBe('HIGH')
    expect(calculateFraudAlertLevel(0, 100)).toBe('HIGH')
    expect(calculateFraudAlertLevel(39, 90)).toBe('HIGH')
  })

  it('retorna MEDIUM quando livenessScore < 60 ou similarityScore < 60', () => {
    expect(calculateFraudAlertLevel(50, 70)).toBe('MEDIUM')
    expect(calculateFraudAlertLevel(70, 50)).toBe('MEDIUM')
  })

  it('retorna LOW quando livenessScore < 80 ou similarityScore < 70', () => {
    expect(calculateFraudAlertLevel(65, 65)).toBe('LOW')
    expect(calculateFraudAlertLevel(75, 65)).toBe('LOW')
  })

  it('retorna NONE quando livenessScore >= 80 e similarityScore >= 70', () => {
    expect(calculateFraudAlertLevel(80, 70)).toBe('NONE')
    expect(calculateFraudAlertLevel(95, 95)).toBe('NONE')
    expect(calculateFraudAlertLevel(100, 100)).toBe('NONE')
  })
})

describe('MockBiometricProvider', () => {
  const provider = new MockBiometricProvider()

  it('retorna match=false e fraudAlertLevel=HIGH para buffer uniforme (foto plana)', async () => {
    const uniformBuffer = Buffer.alloc(4096, 128)
    const result = await provider.verify(uniformBuffer)
    expect(result.fraudAlertLevel).toBe('HIGH')
    expect(result.match).toBe(false)
  })

  it('retorna match=true para buffer com alta variância (face real)', async () => {
    const noisyBuffer = Buffer.from(
      Array.from({ length: 4096 }, (_, i) => (i % 2 === 0 ? 0 : 255))
    )
    const result = await provider.verify(noisyBuffer)
    expect(result.match).toBe(true)
    expect(result.livenessScore).toBeGreaterThan(0.4)
  })
})

// ─── Integration tests: endpoint biometric-verify ───────────────────────────

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    session: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    biometricRecord: { create: vi.fn() },
  },
}))

vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn().mockResolvedValue({ userId: 'user-1', type: 'challenge' }),
  signToken: vi.fn().mockResolvedValue('mocked.token'),
}))

vi.mock('@/lib/biometric-provider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/biometric-provider')>()
  return {
    ...actual,
    getBiometricProvider: vi.fn(() => ({
      verify: vi.fn().mockResolvedValue({
        match: false,
        similarityScore: 0.3,
        livenessScore: 0.2,
        confidenceLevel: 0.25,
        fraudAlertLevel: 'HIGH',
        aiEstimatedAge: undefined,
      }),
    })),
  }
})

import { prisma } from '@/lib/prisma'
import { POST as biometricVerifyPOST } from '@/app/api/auth/biometric-verify/route'

describe('POST /api/auth/biometric-verify — liveness integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'admin@test.com',
      passwordHash: 'hash',
      fullName: 'Admin',
      role: 'MAIN_MANAGER',
      photoUrl: null,
      biometricVerified: false,
      documentVerified: false,
      birthDate: new Date(),
      phone: '',
      cpf: '',
      rg: '',
      secretaryId: null,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never)
    vi.mocked(prisma.biometricRecord.create).mockResolvedValue({} as never)
  })

  it('retorna 403 com error=fraud_detected quando fraudAlertLevel=HIGH', async () => {
    const formData = new FormData()
    formData.append('challengeToken', 'valid.challenge.token')
    formData.append('faceImage', new Blob(['fake'], { type: 'image/jpeg' }), 'face.jpg')

    const req = new NextRequest('http://localhost/api/auth/biometric-verify', {
      method: 'POST',
      body: formData,
    })

    const res = await biometricVerifyPOST(req)
    const data = await res.json() as { error: string }

    expect(res.status).toBe(403)
    expect(data.error).toBe('fraud_detected')
  })

  it('salva BiometricRecord com fraudAlertLevel correto', async () => {
    const formData = new FormData()
    formData.append('challengeToken', 'valid.challenge.token')
    formData.append('faceImage', new Blob(['fake'], { type: 'image/jpeg' }), 'face.jpg')

    const req = new NextRequest('http://localhost/api/auth/biometric-verify', {
      method: 'POST',
      body: formData,
    })

    await biometricVerifyPOST(req)

    expect(vi.mocked(prisma.biometricRecord.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fraudAlertLevel: 'HIGH' }),
      })
    )
  })
})
