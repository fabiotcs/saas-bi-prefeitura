import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    auditLog: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}))

// Mock jwt
vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
  signToken: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { DELETE, PATCH, GET as getLogById } from '@/app/api/audit/logs/[id]/route'
import { GET as listLogsGET } from '@/app/api/audit/logs/route'

const baseUser = {
  id: 'user-1',
  email: 'user@test.com',
  role: 'MAIN_MANAGER',
  passwordHash: 'hash',
  fullName: 'Admin',
  secretaryId: null,
  biometricVerified: false,
  documentVerified: false,
  birthDate: new Date(),
  phone: '',
  cpf: '',
  rg: '',
  photoUrl: null,
  lastLogin: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function makeRequest(
  method: string,
  url: string,
  headers: Record<string, string> = { Authorization: 'Bearer valid.token' }
): NextRequest {
  return new NextRequest(url, { method, headers })
}

// ─── DELETE /api/audit/logs/:id ─────────────────────────────────────────────

describe('DELETE /api/audit/logs/:id', () => {
  it('retorna 403 sempre — logs são imutáveis', async () => {
    const req = makeRequest('DELETE', 'http://localhost/api/audit/logs/some-id')
    const res = await DELETE(req, { params: { id: 'some-id' } })
    expect(res.status).toBe(403)
    const data = await res.json() as { error: string }
    expect(data.error).toContain('imutáveis')
  })
})

// ─── PATCH /api/audit/logs/:id ──────────────────────────────────────────────

describe('PATCH /api/audit/logs/:id', () => {
  it('retorna 403 sempre — logs são imutáveis', async () => {
    const req = makeRequest('PATCH', 'http://localhost/api/audit/logs/some-id')
    const res = await PATCH(req, { params: { id: 'some-id' } })
    expect(res.status).toBe(403)
    const data = await res.json() as { error: string }
    expect(data.error).toContain('imutáveis')
  })
})

// ─── GET /api/audit/logs ────────────────────────────────────────────────────

describe('GET /api/audit/logs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
  })

  it('retorna 403 para SECRETARY_USER', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...baseUser,
      role: 'SECRETARY_USER',
    } as never)

    const req = new NextRequest('http://localhost/api/audit/logs', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await listLogsGET(req)
    expect(res.status).toBe(403)
  })

  it('retorna 200 com lista para MAIN_MANAGER', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(baseUser as never)
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
      {
        id: 'log-1',
        action: 'LOGIN',
        urlPath: '/api/auth/login',
        userId: 'user-1',
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
        status: 'SUCCESS',
        metadata: null,
        occurredAt: new Date(),
        user: { id: 'user-1', fullName: 'Admin', photoUrl: null, email: 'user@test.com' },
      },
    ] as never)
    vi.mocked(prisma.auditLog.count).mockResolvedValue(1)

    const req = new NextRequest('http://localhost/api/audit/logs', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await listLogsGET(req)
    expect(res.status).toBe(200)
    const data = await res.json() as { data: unknown[]; total: number }
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.total).toBe(1)
  })

  it('retorna 401 sem token', async () => {
    const req = new NextRequest('http://localhost/api/audit/logs')
    const res = await listLogsGET(req)
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/audit/logs/:id ────────────────────────────────────────────────

describe('GET /api/audit/logs/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
  })

  it('retorna 200 com log específico para AUDIT_VIEWER', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...baseUser,
      role: 'AUDIT_VIEWER',
    } as never)
    vi.mocked(prisma.auditLog.findUnique).mockResolvedValue({
      id: 'log-1',
      action: 'LOGIN',
      urlPath: '/api/auth/login',
      userId: 'user-1',
      userAgent: 'test-agent',
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
      metadata: null,
      occurredAt: new Date(),
      user: { id: 'user-1', fullName: 'Admin', photoUrl: null, email: 'user@test.com' },
    } as never)

    const req = makeRequest('GET', 'http://localhost/api/audit/logs/log-1')
    const res = await getLogById(req, { params: { id: 'log-1' } })
    expect(res.status).toBe(200)
  })

  it('retorna 404 quando log não existe', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(baseUser as never)
    vi.mocked(prisma.auditLog.findUnique).mockResolvedValue(null)

    const req = makeRequest('GET', 'http://localhost/api/audit/logs/nonexistent')
    const res = await getLogById(req, { params: { id: 'nonexistent' } })
    expect(res.status).toBe(404)
  })
})
