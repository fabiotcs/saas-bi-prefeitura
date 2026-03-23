import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    order: { findMany: vi.fn() },
    establishment: { findMany: vi.fn() },
    invoiceItem: { findMany: vi.fn() },
    invoice: { findMany: vi.fn() },
    auditLog: { findMany: vi.fn() },
  },
}))

vi.mock('@/lib/jwt', () => ({ verifyToken: vi.fn() }))

import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { GET as previewGET } from '@/app/api/reports/preview/route'
import { GET as exportGET } from '@/app/api/reports/export/route'

const mainManager = {
  id: 'user-1',
  email: 'admin@test.com',
  role: 'MAIN_MANAGER',
  fullName: 'Admin',
}

const mockOrders = [
  {
    id: 'order-1',
    code: 'OS-001',
    name: 'Pedido Teste',
    status: 'OPEN',
    createdAt: new Date('2026-03-01'),
    secretary: { name: 'Sec. Educação' },
    createdBy: { fullName: 'Admin' },
  },
]

const mockEstablishments = [
  {
    id: 'est-1',
    name: 'Empresa ABC',
    cnpj: '12345678000195',
    city: 'Araçuaí',
    state: 'MG',
    status: 'ACTIVE',
  },
]

const mockInvoiceItems = [
  { itemName: 'Papel A4', unitPrice: 25.0, quantity: 10, total: 250.0 },
  { itemName: 'Caneta BIC', unitPrice: 2.0, quantity: 50, total: 100.0 },
]

const mockAuditLogs = [
  {
    id: 'log-1',
    action: 'LOGIN',
    status: 'SUCCESS',
    occurredAt: new Date('2026-03-15'),
    user: { fullName: 'Admin' },
  },
]

function makeRequest(url: string): NextRequest {
  return new NextRequest(url, {
    method: 'GET',
    headers: { Authorization: 'Bearer valid.token' },
  })
}

// ─── GET /api/reports/preview ─────────────────────────────────────────────────

describe('GET /api/reports/preview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
  })

  it('retorna 400 sem parâmetro type', async () => {
    const req = makeRequest('http://localhost/api/reports/preview')
    const res = await previewGET(req)
    expect(res.status).toBe(400)
  })

  it('retorna 401 sem autenticação', async () => {
    const req = new NextRequest('http://localhost/api/reports/preview?type=ORDERS', { method: 'GET' })
    const res = await previewGET(req)
    expect(res.status).toBe(401)
  })

  it('retorna 200 com colunas e linhas para ORDERS', async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders as never)
    const req = makeRequest('http://localhost/api/reports/preview?type=ORDERS')
    const res = await previewGET(req)
    expect(res.status).toBe(200)
    const body = await res.json() as { columns: string[]; rows: unknown[] }
    expect(body).toHaveProperty('columns')
    expect(body).toHaveProperty('rows')
    expect(Array.isArray(body.columns)).toBe(true)
    expect(Array.isArray(body.rows)).toBe(true)
  })

  it('retorna 200 para ESTABLISHMENTS', async () => {
    vi.mocked(prisma.establishment.findMany).mockResolvedValue(mockEstablishments as never)
    const req = makeRequest('http://localhost/api/reports/preview?type=ESTABLISHMENTS')
    const res = await previewGET(req)
    expect(res.status).toBe(200)
    const body = await res.json() as { columns: string[]; rows: unknown[] }
    expect(body.columns).toContain('Nome')
    expect(body.columns).toContain('CNPJ')
  })

  it('retorna 200 para TOP_PRODUCTS', async () => {
    vi.mocked(prisma.invoiceItem.findMany).mockResolvedValue(mockInvoiceItems as never)
    const req = makeRequest('http://localhost/api/reports/preview?type=TOP_PRODUCTS')
    const res = await previewGET(req)
    expect(res.status).toBe(200)
    const body = await res.json() as { columns: string[] }
    expect(body.columns).toContain('Produto')
  })

  it('retorna 200 para OPERATIONS_LOG', async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockAuditLogs as never)
    const req = makeRequest('http://localhost/api/reports/preview?type=OPERATIONS_LOG')
    const res = await previewGET(req)
    expect(res.status).toBe(200)
  })

  it('retorna 400 para tipo inválido', async () => {
    const req = makeRequest('http://localhost/api/reports/preview?type=INVALID')
    const res = await previewGET(req)
    expect(res.status).toBe(400)
  })
})

// ─── GET /api/reports/export ──────────────────────────────────────────────────

describe('GET /api/reports/export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders as never)
  })

  it('retorna 400 sem parâmetro type', async () => {
    const req = makeRequest('http://localhost/api/reports/export')
    const res = await exportGET(req)
    expect(res.status).toBe(400)
  })

  it('retorna 401 sem autenticação', async () => {
    const req = new NextRequest('http://localhost/api/reports/export?type=ORDERS&format=CSV', { method: 'GET' })
    const res = await exportGET(req)
    expect(res.status).toBe(401)
  })

  it('exporta CSV para ORDERS', async () => {
    const req = makeRequest('http://localhost/api/reports/export?type=ORDERS&format=CSV')
    const res = await exportGET(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/csv')
  })

  it('exporta PDF para ORDERS', async () => {
    const req = makeRequest('http://localhost/api/reports/export?type=ORDERS&format=PDF')
    const res = await exportGET(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/pdf')
  })

  it('exporta EXCEL para ORDERS', async () => {
    const req = makeRequest('http://localhost/api/reports/export?type=ORDERS&format=EXCEL')
    const res = await exportGET(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('spreadsheetml')
  })

  it('exporta CSV para ESTABLISHMENTS', async () => {
    vi.mocked(prisma.establishment.findMany).mockResolvedValue(mockEstablishments as never)
    const req = makeRequest('http://localhost/api/reports/export?type=ESTABLISHMENTS&format=CSV')
    const res = await exportGET(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/csv')
  })
})
