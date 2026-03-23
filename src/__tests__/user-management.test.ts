import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { isValidCPF, formatCPF } from '@/lib/cpf'

// ─── Unit: CPF validation ───────────────────────────────────────────────────

describe('isValidCPF', () => {
  it('valida CPF correto', () => {
    expect(isValidCPF('529.982.247-25')).toBe(true)
    expect(isValidCPF('52998224725')).toBe(true)
  })

  it('rejeita CPF com dígito verificador errado', () => {
    expect(isValidCPF('529.982.247-26')).toBe(false)
    expect(isValidCPF('111.111.111-11')).toBe(false)
  })

  it('rejeita CPF com todos dígitos iguais', () => {
    expect(isValidCPF('000.000.000-00')).toBe(false)
    expect(isValidCPF('999.999.999-99')).toBe(false)
  })

  it('rejeita CPF com comprimento incorreto', () => {
    expect(isValidCPF('123.456.789')).toBe(false)
    expect(isValidCPF('')).toBe(false)
  })
})

describe('formatCPF', () => {
  it('formata CPF com máscara', () => {
    expect(formatCPF('52998224725')).toBe('529.982.247-25')
  })

  it('aceita CPF já formatado', () => {
    expect(formatCPF('529.982.247-25')).toBe('529.982.247-25')
  })

  it('limita a 11 dígitos', () => {
    expect(formatCPF('529982247251234')).toBe('529.982.247-25')
  })
})

// ─── Integration: API routes ────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: { create: vi.fn() },
  },
}))

vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
  signToken: vi.fn(),
}))

vi.mock('bcrypt', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed'), compare: vi.fn() },
  hash: vi.fn().mockResolvedValue('hashed'),
}))

import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { POST as createUserPOST, GET as listUsersGET } from '@/app/api/users/route'

const adminUser = {
  id: 'admin-1', email: 'admin@test.com', role: 'MAIN_MANAGER',
  passwordHash: 'hash', fullName: 'Admin', secretaryId: null,
  biometricVerified: false, documentVerified: false,
  birthDate: new Date(), phone: '', cpf: '', rg: '',
  photoUrl: null, lastLogin: null, createdAt: new Date(), updatedAt: new Date(),
}

function makeRequest(method: string, body: unknown, url = 'http://localhost/api/users'): NextRequest {
  return new NextRequest(url, {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid.token' },
  })
}

describe('POST /api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'admin-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(adminUser as never)
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'new-1', email: 'novo@test.com' } as never)
  })

  it('retorna 422 para CPF inválido', async () => {
    const req = makeRequest('POST', {
      fullName: 'Teste', birthDate: '1990-01-01', phone: '(38) 99999-0000',
      email: 'novo@test.com', cpf: '111.111.111-11', rg: '123456', role: 'SECRETARY_USER',
    })
    const res = await createUserPOST(req)
    expect(res.status).toBe(422)
    const data = await res.json() as { error: string }
    expect(data.error).toContain('CPF inválido')
  })

  it('retorna 409 para e-mail duplicado', async () => {
    // First call (get auth user) returns admin, second call (email check) returns existing user
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(adminUser as never)
      .mockResolvedValueOnce({ id: 'other' } as never)
    const req = makeRequest('POST', {
      fullName: 'Teste', birthDate: '1990-01-01', phone: '(38) 99999-0000',
      email: 'duplicado@test.com', cpf: '529.982.247-25', rg: '123456', role: 'SECRETARY_USER',
    })
    const res = await createUserPOST(req)
    expect(res.status).toBe(409)
    const data = await res.json() as { error: string }
    expect(data.error).toContain('E-mail já cadastrado')
  })

  it('retorna 201 para criação válida', async () => {
    // auth user (admin) + email check (null) + cpf check (null)
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(adminUser as never)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
    const req = makeRequest('POST', {
      fullName: 'Novo Usuário', birthDate: '1990-01-01', phone: '(38) 99999-0000',
      email: 'novo@test.com', cpf: '529.982.247-25', rg: '123456', role: 'SECRETARY_USER',
    })
    const res = await createUserPOST(req)
    expect(res.status).toBe(201)
  })

  it('retorna 403 para SECRETARY_USER tentando criar usuário', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...adminUser, role: 'SECRETARY_USER' } as never)
    const req = makeRequest('POST', {
      fullName: 'Teste', birthDate: '1990-01-01', phone: '(38) 99999-0000',
      email: 'novo@test.com', cpf: '529.982.247-25', rg: '123456', role: 'SECRETARY_USER',
    })
    const res = await createUserPOST(req)
    expect(res.status).toBe(403)
  })
})

describe('GET /api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'admin-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(adminUser as never)
    vi.mocked(prisma.user.findMany).mockResolvedValue([])
    vi.mocked(prisma.user.count).mockResolvedValue(0)
  })

  it('retorna 403 para AUDIT_VIEWER', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...adminUser, role: 'AUDIT_VIEWER' } as never)
    const req = new NextRequest('http://localhost/api/users', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await listUsersGET(req)
    expect(res.status).toBe(403)
  })

  it('retorna 200 com lista para MAIN_MANAGER', async () => {
    const req = new NextRequest('http://localhost/api/users', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await listUsersGET(req)
    expect(res.status).toBe(200)
    const data = await res.json() as { data: unknown[] }
    expect(Array.isArray(data.data)).toBe(true)
  })
})
