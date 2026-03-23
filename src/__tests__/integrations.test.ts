import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    apiKey: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    apiCallLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

vi.mock('@/lib/jwt', () => ({ verifyToken: vi.fn() }))
vi.mock('bcrypt', () => ({ default: { hash: vi.fn().mockResolvedValue('hashed-key') } }))
vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>()
  return { ...actual, randomBytes: vi.fn().mockReturnValue({ toString: () => 'mock-raw-key-64chars' }) }
})

import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { GET as listKeysGET, POST as createKeyPOST } from '@/app/api/integrations/api-keys/route'
import { DELETE as revokeKeyDELETE } from '@/app/api/integrations/api-keys/[id]/route'
import { GET as logsGET } from '@/app/api/integrations/logs/route'
import { GET as statsGET } from '@/app/api/integrations/stats/route'

const mainManager = {
  id: 'user-1',
  email: 'admin@test.com',
  role: 'MAIN_MANAGER',
  fullName: 'Admin',
}

const secretaryUser = {
  id: 'user-3',
  email: 'user@test.com',
  role: 'SECRETARY_USER',
  fullName: 'User',
}

const mockApiKey = {
  id: 'key-1',
  name: 'Sistema ERP',
  keyHash: 'hashed',
  permissions: ['read:orders'],
  lastUsedAt: null,
  revoked: false,
  createdAt: new Date('2026-03-01'),
  createdById: 'user-1',
}

const mockLogs = [
  {
    id: 'log-1',
    endpoint: '/api/establishments',
    method: 'GET',
    statusCode: 200,
    responseTimeMs: 45,
    occurredAt: new Date(),
    ipAddress: '192.168.1.1',
    apiKeyId: 'key-1',
  },
]

function makeGetRequest(url: string): NextRequest {
  return new NextRequest(url, {
    method: 'GET',
    headers: { Authorization: 'Bearer valid.token' },
  })
}

function makePostRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer valid.token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

function makeDeleteRequest(url: string): NextRequest {
  return new NextRequest(url, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer valid.token' },
  })
}

// ─── GET /api/integrations/api-keys ───────────────────────────────────────────

describe('GET /api/integrations/api-keys', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.apiKey.findMany).mockResolvedValue([mockApiKey] as never)
  })

  it('retorna 200 com lista de API Keys', async () => {
    const req = makeGetRequest('http://localhost/api/integrations/api-keys')
    const res = await listKeysGET(req)
    expect(res.status).toBe(200)
    const body = await res.json() as unknown[]
    expect(Array.isArray(body)).toBe(true)
  })

  it('retorna 401 sem autenticação', async () => {
    const req = new NextRequest('http://localhost/api/integrations/api-keys', { method: 'GET' })
    const res = await listKeysGET(req)
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/integrations/api-keys ──────────────────────────────────────────

describe('POST /api/integrations/api-keys', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.apiKey.create).mockResolvedValue(mockApiKey as never)
  })

  it('cria API Key e retorna 201 com rawKey', async () => {
    const req = makePostRequest('http://localhost/api/integrations/api-keys', {
      name: 'Sistema ERP',
      permissions: ['read:orders'],
    })
    const res = await createKeyPOST(req)
    expect(res.status).toBe(201)
    const body = await res.json() as { rawKey: string }
    expect(body).toHaveProperty('rawKey')
  })

  it('retorna 422 sem nome', async () => {
    const req = makePostRequest('http://localhost/api/integrations/api-keys', {
      permissions: ['read:orders'],
    })
    const res = await createKeyPOST(req)
    expect(res.status).toBe(422)
  })

  it('retorna 401 sem autenticação', async () => {
    const req = new NextRequest('http://localhost/api/integrations/api-keys', { method: 'POST' })
    const res = await createKeyPOST(req)
    expect(res.status).toBe(401)
  })
})

// ─── DELETE /api/integrations/api-keys/[id] ───────────────────────────────────

describe('DELETE /api/integrations/api-keys/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(mockApiKey as never)
    vi.mocked(prisma.apiKey.update).mockResolvedValue({ ...mockApiKey, revoked: true } as never)
  })

  it('revoga API Key e retorna 200', async () => {
    const req = makeDeleteRequest('http://localhost/api/integrations/api-keys/key-1')
    const res = await revokeKeyDELETE(req, { params: { id: 'key-1' } })
    expect(res.status).toBe(200)
    const body = await res.json() as { revoked: boolean }
    expect(body.revoked).toBe(true)
  })

  it('retorna 404 quando chave não existe', async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(null)
    const req = makeDeleteRequest('http://localhost/api/integrations/api-keys/key-999')
    const res = await revokeKeyDELETE(req, { params: { id: 'key-999' } })
    expect(res.status).toBe(404)
  })

  it('retorna 403 quando outro usuário tenta revogar', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(secretaryUser as never)
    const req = makeDeleteRequest('http://localhost/api/integrations/api-keys/key-1')
    const res = await revokeKeyDELETE(req, { params: { id: 'key-1' } })
    expect(res.status).toBe(403)
  })
})

// ─── GET /api/integrations/logs ───────────────────────────────────────────────

describe('GET /api/integrations/logs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.apiCallLog.findMany).mockResolvedValue(mockLogs as never)
  })

  it('retorna 200 com lista de logs', async () => {
    const req = makeGetRequest('http://localhost/api/integrations/logs')
    const res = await logsGET(req)
    expect(res.status).toBe(200)
    const body = await res.json() as unknown[]
    expect(Array.isArray(body)).toBe(true)
  })

  it('retorna 401 sem autenticação', async () => {
    const req = new NextRequest('http://localhost/api/integrations/logs', { method: 'GET' })
    const res = await logsGET(req)
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/integrations/stats ──────────────────────────────────────────────

describe('GET /api/integrations/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.apiKey.count).mockResolvedValue(5)
    vi.mocked(prisma.apiCallLog.count).mockResolvedValue(100)
    vi.mocked(prisma.apiCallLog.findMany).mockResolvedValue(mockLogs as never)
  })

  it('retorna 200 com estatísticas de integração', async () => {
    const req = makeGetRequest('http://localhost/api/integrations/stats')
    const res = await statsGET(req)
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('totalApiKeys')
    expect(body).toHaveProperty('activeApiKeys')
    expect(body).toHaveProperty('totalCalls')
    expect(body).toHaveProperty('callsLast24h')
    expect(body).toHaveProperty('avgResponseTimeMs')
    expect(body).toHaveProperty('successRate')
  })

  it('retorna 401 sem autenticação', async () => {
    const req = new NextRequest('http://localhost/api/integrations/stats', { method: 'GET' })
    const res = await statsGET(req)
    expect(res.status).toBe(401)
  })
})
