import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { isValidCNPJ, formatCNPJ } from '@/lib/cnpj'

// ─── Unit: CNPJ validation ──────────────────────────────────────────────────

describe('isValidCNPJ', () => {
  it('valida CNPJ correto', () => {
    expect(isValidCNPJ('11.222.333/0001-81')).toBe(true)
    expect(isValidCNPJ('11222333000181')).toBe(true)
  })

  it('rejeita CNPJ com dígito verificador errado', () => {
    expect(isValidCNPJ('11.222.333/0001-82')).toBe(false)
  })

  it('rejeita CNPJ com todos dígitos iguais', () => {
    expect(isValidCNPJ('00.000.000/0000-00')).toBe(false)
    expect(isValidCNPJ('11.111.111/1111-11')).toBe(false)
  })

  it('rejeita CNPJ com comprimento incorreto', () => {
    expect(isValidCNPJ('11.222.333')).toBe(false)
    expect(isValidCNPJ('')).toBe(false)
  })
})

describe('formatCNPJ', () => {
  it('formata CNPJ com máscara', () => {
    expect(formatCNPJ('11222333000181')).toBe('11.222.333/0001-81')
  })

  it('aceita CNPJ já formatado', () => {
    expect(formatCNPJ('11.222.333/0001-81')).toBe('11.222.333/0001-81')
  })

  it('limita a 14 dígitos', () => {
    expect(formatCNPJ('112223330001811234')).toBe('11.222.333/0001-81')
  })
})

// ─── Integration: API routes ─────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => ({
  prisma: {
    secretary: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { POST as createSecretaryPOST, GET as listSecretariesGET } from '@/app/api/secretaries/route'

const adminUser = {
  id: 'admin-1', email: 'admin@test.com', role: 'MAIN_MANAGER',
  passwordHash: 'hash', fullName: 'Admin', secretaryId: null,
}

function makeRequest(method: string, body: unknown, url = 'http://localhost/api/secretaries'): NextRequest {
  return new NextRequest(url, {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid.token' },
  })
}

describe('POST /api/secretaries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'admin-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(adminUser as never)
  })

  it('retorna 422 para CNPJ inválido', async () => {
    const req = makeRequest('POST', {
      name: 'Sec Saúde', phone: '(38) 3333-0000',
      cnpj: '11.111.111/1111-11', secretaryPersonName: 'Dr. Silva',
    })
    const res = await createSecretaryPOST(req)
    expect(res.status).toBe(422)
    const data = await res.json() as { error: string }
    expect(data.error).toContain('CNPJ inválido')
  })

  it('retorna 409 para nome duplicado', async () => {
    vi.mocked(prisma.secretary.findFirst).mockResolvedValue({ id: 'other', name: 'Sec Saúde' } as never)
    const req = makeRequest('POST', {
      name: 'Sec Saúde', phone: '(38) 3333-0000',
      cnpj: '11.222.333/0001-81', secretaryPersonName: 'Dr. Silva',
    })
    const res = await createSecretaryPOST(req)
    expect(res.status).toBe(409)
    const data = await res.json() as { error: string }
    expect(data.error).toContain('Secretaria já cadastrada')
  })

  it('retorna 201 para criação válida', async () => {
    vi.mocked(prisma.secretary.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.secretary.create).mockResolvedValue({ id: 'sec-1', name: 'Sec Saúde' } as never)
    const req = makeRequest('POST', {
      name: 'Sec Saúde', phone: '(38) 3333-0000',
      cnpj: '11.222.333/0001-81', secretaryPersonName: 'Dr. Silva',
    })
    const res = await createSecretaryPOST(req)
    expect(res.status).toBe(201)
  })

  it('retorna 403 para SECRETARY_USER tentando criar', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...adminUser, role: 'SECRETARY_USER' } as never)
    const req = makeRequest('POST', {
      name: 'Sec Saúde', phone: '(38) 3333-0000',
      cnpj: '11.222.333/0001-81', secretaryPersonName: 'Dr. Silva',
    })
    const res = await createSecretaryPOST(req)
    expect(res.status).toBe(403)
  })
})

describe('GET /api/secretaries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'admin-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(adminUser as never)
    vi.mocked(prisma.secretary.findMany).mockResolvedValue([])
    vi.mocked(prisma.secretary.count).mockResolvedValue(0)
  })

  it('retorna 200 com lista', async () => {
    const req = new NextRequest('http://localhost/api/secretaries', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await listSecretariesGET(req)
    expect(res.status).toBe(200)
    const data = await res.json() as { data: unknown[] }
    expect(Array.isArray(data.data)).toBe(true)
  })

  it('retorna 401 sem autenticação', async () => {
    vi.mocked(verifyToken).mockRejectedValue(new Error('invalid'))
    const req = new NextRequest('http://localhost/api/secretaries')
    const res = await listSecretariesGET(req)
    expect(res.status).toBe(401)
  })
})
