import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    systemSettings: { upsert: vi.fn() },
  },
}))

vi.mock('@/lib/jwt', () => ({ verifyToken: vi.fn() }))

import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { GET, PATCH } from '@/app/api/settings/route'

const mainManager = {
  id: 'user-1',
  email: 'admin@test.com',
  role: 'MAIN_MANAGER',
  fullName: 'Admin',
}

const secretaryManager = {
  id: 'user-2',
  email: 'manager@test.com',
  role: 'SECRETARY_MANAGER',
  fullName: 'Manager',
}

const mockSettings = {
  id: 'system',
  billingMode: 'CENTRALIZED',
  billingClosingDay: 25,
  requireManagerApproval: true,
  requireBudgetValidation: true,
  minimumProposalsForApproval: 3,
  restrictOrderCreationToVerifiedUsers: false,
  updatedAt: new Date(),
}

function makeGetRequest(): NextRequest {
  return new NextRequest('http://localhost/api/settings', {
    method: 'GET',
    headers: { Authorization: 'Bearer valid.token' },
  })
}

function makePatchRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/settings', {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer valid.token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

// ─── GET /api/settings ────────────────────────────────────────────────────────

describe('GET /api/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.systemSettings.upsert).mockResolvedValue(mockSettings as never)
  })

  it('retorna 200 com todos os campos de configuração', async () => {
    const req = makeGetRequest()
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('id', 'system')
    expect(body).toHaveProperty('billingMode')
    expect(body).toHaveProperty('billingClosingDay')
    expect(body).toHaveProperty('requireManagerApproval')
    expect(body).toHaveProperty('requireBudgetValidation')
    expect(body).toHaveProperty('minimumProposalsForApproval')
    expect(body).toHaveProperty('restrictOrderCreationToVerifiedUsers')
  })

  it('retorna 401 sem autenticação', async () => {
    const req = new NextRequest('http://localhost/api/settings', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})

// ─── PATCH /api/settings ──────────────────────────────────────────────────────

describe('PATCH /api/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.systemSettings.upsert).mockResolvedValue(mockSettings as never)
  })

  it('atualiza configurações e retorna 200 (MAIN_MANAGER)', async () => {
    const req = makePatchRequest({ billingMode: 'DECENTRALIZED', billingClosingDay: 15 })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
  })

  it('retorna 403 para SECRETARY_MANAGER', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(secretaryManager as never)
    const req = makePatchRequest({ billingMode: 'DECENTRALIZED' })
    const res = await PATCH(req)
    expect(res.status).toBe(403)
  })

  it('retorna 422 para billingClosingDay fora do range (0)', async () => {
    const req = makePatchRequest({ billingClosingDay: 0 })
    const res = await PATCH(req)
    expect(res.status).toBe(422)
  })

  it('retorna 422 para billingClosingDay fora do range (29)', async () => {
    const req = makePatchRequest({ billingClosingDay: 29 })
    const res = await PATCH(req)
    expect(res.status).toBe(422)
  })

  it('aceita billingClosingDay=1', async () => {
    const req = makePatchRequest({ billingClosingDay: 1 })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
  })

  it('aceita billingClosingDay=28', async () => {
    const req = makePatchRequest({ billingClosingDay: 28 })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
  })

  it('retorna 401 sem autenticação', async () => {
    const req = new NextRequest('http://localhost/api/settings', { method: 'PATCH' })
    const res = await PATCH(req)
    expect(res.status).toBe(401)
  })
})
