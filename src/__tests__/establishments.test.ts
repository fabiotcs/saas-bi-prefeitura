import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    establishment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    establishmentFavorite: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/jwt', () => ({ verifyToken: vi.fn() }))

import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { GET as listGET, POST as createPOST } from '@/app/api/establishments/route'
import { GET as detailGET } from '@/app/api/establishments/[id]/route'
import { PATCH as favoritePATCH } from '@/app/api/establishments/[id]/favorite/route'

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

const viewer = {
  id: 'user-3',
  email: 'viewer@test.com',
  role: 'AUDIT_VIEWER',
  fullName: 'Viewer',
}

const mockEstablishment = {
  id: 'est-1',
  name: 'Empresa ABC',
  cnpj: '12345678000195',
  address: 'Rua Teste, 123',
  city: 'Araçuaí',
  state: 'MG',
  lat: null,
  lng: null,
  phone: '(33) 99999-0000',
  email: 'abc@empresa.com',
  servicesDescription: 'Fornecimento de materiais',
  ordersCompleted: 10,
  rating: 4.5,
  status: 'ACTIVE',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  favorites: [],
}

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

function makePatchRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer valid.token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

// ─── GET /api/establishments ───────────────────────────────────────────────────

describe('GET /api/establishments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.establishment.findMany).mockResolvedValue([mockEstablishment] as never)
    vi.mocked(prisma.establishment.count).mockResolvedValue(1)
  })

  it('retorna 200 com lista de estabelecimentos', async () => {
    const req = makeGetRequest('http://localhost/api/establishments')
    const res = await listGET(req)

    expect(res.status).toBe(200)
    const body = await res.json() as { data: unknown[]; total: number; page: number }
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('total')
    expect(body).toHaveProperty('page')
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.total).toBe(1)
  })

  it('retorna isFavorite=false quando não há favoritos', async () => {
    const req = makeGetRequest('http://localhost/api/establishments')
    const res = await listGET(req)
    const body = await res.json() as { data: Array<{ isFavorite: boolean }> }
    expect(body.data[0].isFavorite).toBe(false)
  })

  it('retorna 401 sem autenticação', async () => {
    const req = new NextRequest('http://localhost/api/establishments', { method: 'GET' })
    const res = await listGET(req)
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/establishments/[id] ─────────────────────────────────────────────

describe('GET /api/establishments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.establishment.findUnique).mockResolvedValue(mockEstablishment as never)
  })

  it('retorna 200 com detalhes do estabelecimento', async () => {
    const req = makeGetRequest('http://localhost/api/establishments/est-1')
    const res = await detailGET(req, { params: { id: 'est-1' } })

    expect(res.status).toBe(200)
    const body = await res.json() as { id: string; name: string; isFavorite: boolean }
    expect(body.id).toBe('est-1')
    expect(body.name).toBe('Empresa ABC')
    expect(body).toHaveProperty('isFavorite')
  })

  it('retorna 404 quando não encontrado', async () => {
    vi.mocked(prisma.establishment.findUnique).mockResolvedValue(null)
    const req = makeGetRequest('http://localhost/api/establishments/est-999')
    const res = await detailGET(req, { params: { id: 'est-999' } })
    expect(res.status).toBe(404)
  })

  it('retorna 401 sem autenticação', async () => {
    const req = new NextRequest('http://localhost/api/establishments/est-1', { method: 'GET' })
    const res = await detailGET(req, { params: { id: 'est-1' } })
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/establishments ─────────────────────────────────────────────────

describe('POST /api/establishments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-2', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(secretaryManager as never)
    vi.mocked(prisma.establishment.create).mockResolvedValue({ ...mockEstablishment, favorites: undefined } as never)
  })

  it('cria estabelecimento e retorna 201', async () => {
    const req = makePostRequest('http://localhost/api/establishments', {
      name: 'Empresa ABC',
      cnpj: '12345678000195',
    })
    const res = await createPOST(req)
    expect(res.status).toBe(201)
  })

  it('retorna 422 sem nome', async () => {
    const req = makePostRequest('http://localhost/api/establishments', {
      cnpj: '12345678000195',
    })
    const res = await createPOST(req)
    expect(res.status).toBe(422)
  })

  it('retorna 403 para AUDIT_VIEWER', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(viewer as never)
    const req = makePostRequest('http://localhost/api/establishments', {
      name: 'Nova Empresa',
      cnpj: '98765432000100',
    })
    const res = await createPOST(req)
    expect(res.status).toBe(403)
  })
})

// ─── PATCH /api/establishments/[id]/favorite ──────────────────────────────────

describe('PATCH /api/establishments/[id]/favorite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.establishmentFavorite.upsert).mockResolvedValue({ id: 'fav-1', userId: 'user-1', establishmentId: 'est-1', createdAt: new Date() } as never)
    vi.mocked(prisma.establishmentFavorite.deleteMany).mockResolvedValue({ count: 1 } as never)
  })

  it('adiciona favorito quando favorite=true', async () => {
    const req = makePatchRequest('http://localhost/api/establishments/est-1/favorite', { favorite: true })
    const res = await favoritePATCH(req, { params: { id: 'est-1' } })
    expect(res.status).toBe(200)
    const body = await res.json() as { isFavorite: boolean }
    expect(body.isFavorite).toBe(true)
  })

  it('remove favorito quando favorite=false', async () => {
    const req = makePatchRequest('http://localhost/api/establishments/est-1/favorite', { favorite: false })
    const res = await favoritePATCH(req, { params: { id: 'est-1' } })
    expect(res.status).toBe(200)
    const body = await res.json() as { isFavorite: boolean }
    expect(body.isFavorite).toBe(false)
  })

  it('retorna 401 sem autenticação', async () => {
    const req = new NextRequest('http://localhost/api/establishments/est-1/favorite', { method: 'PATCH' })
    const res = await favoritePATCH(req, { params: { id: 'est-1' } })
    expect(res.status).toBe(401)
  })
})
