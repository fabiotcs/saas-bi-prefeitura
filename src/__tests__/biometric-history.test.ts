import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    biometricRecord: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

// Mock jwt
vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { GET } from '@/app/api/auth/biometric-history/route'
import { DELETE } from '@/app/api/auth/biometric-history/[id]/route'

function makeGetRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/auth/biometric-history', {
    method: 'GET',
    headers,
  })
}

describe('GET /api/auth/biometric-history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 401 quando não há token de autorização', async () => {
    const req = makeGetRequest()
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('retorna 401 quando o token é inválido', async () => {
    vi.mocked(verifyToken).mockRejectedValue(new Error('Token inválido'))

    const req = makeGetRequest({ Authorization: 'Bearer token.invalido' })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('retorna 403 quando o usuário tem role SECRETARY_USER', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      role: 'SECRETARY_USER',
    } as never)

    const req = makeGetRequest({ Authorization: 'Bearer valid.token' })
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('retorna 403 quando o usuário tem role SECRETARY_MANAGER', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-2', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-2',
      role: 'SECRETARY_MANAGER',
    } as never)

    const req = makeGetRequest({ Authorization: 'Bearer valid.token' })
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('retorna 200 quando o usuário tem role MAIN_MANAGER', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-3', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-3',
      role: 'MAIN_MANAGER',
    } as never)
    vi.mocked(prisma.biometricRecord.findMany).mockResolvedValue([])
    vi.mocked(prisma.biometricRecord.count).mockResolvedValue(0)

    const req = makeGetRequest({ Authorization: 'Bearer valid.token' })
    const res = await GET(req)
    expect(res.status).toBe(200)

    const body = await res.json() as { data: unknown[]; total: number; page: number; limit: number }
    expect(body).toMatchObject({ data: [], total: 0, page: 1, limit: 50 })
  })

  it('retorna 200 quando o usuário tem role AUDIT_VIEWER', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-4', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-4',
      role: 'AUDIT_VIEWER',
    } as never)
    vi.mocked(prisma.biometricRecord.findMany).mockResolvedValue([])
    vi.mocked(prisma.biometricRecord.count).mockResolvedValue(0)

    const req = makeGetRequest({ Authorization: 'Bearer valid.token' })
    const res = await GET(req)
    expect(res.status).toBe(200)
  })

  it('retorna 401 quando o token não é do tipo access', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-5', type: 'refresh' })

    const req = makeGetRequest({ Authorization: 'Bearer refresh.token' })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/auth/biometric-history/:id', () => {
  it('retorna 403 sempre, independente de autenticação', async () => {
    const res = await DELETE()
    expect(res.status).toBe(403)

    const body = await res.json() as { error: string }
    expect(body.error).toContain('imutáveis')
  })

  it('retorna mensagem de erro adequada', async () => {
    const res = await DELETE()
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Operação não permitida. Registros biométricos são imutáveis.')
  })
})
