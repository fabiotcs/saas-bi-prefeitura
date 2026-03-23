import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    invoice: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), create: vi.fn() },
    invoiceItem: { createMany: vi.fn() },
  },
}))

vi.mock('@/lib/jwt', () => ({ verifyToken: vi.fn() }))

import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { GET as summaryGET } from '@/app/api/financial/summary/route'
import { GET as listInvoicesGET, POST as createInvoicePOST } from '@/app/api/financial/invoices/route'

const mainManager = {
  id: 'user-1',
  email: 'manager@test.com',
  role: 'MAIN_MANAGER',
  fullName: 'Manager',
  secretaryId: null,
  passwordHash: 'hash',
}

const secretaryManager = {
  ...mainManager,
  id: 'user-2',
  role: 'SECRETARY_MANAGER',
}

const secretaryUser = {
  ...mainManager,
  id: 'user-3',
  role: 'SECRETARY_USER',
}

const auditViewer = {
  ...mainManager,
  id: 'user-4',
  role: 'AUDIT_VIEWER',
}

function makeRequest(method: string, body: unknown, url: string): NextRequest {
  return new NextRequest(url, {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid.token' },
  })
}

const mockInvoice = {
  id: 'inv-1',
  secretaryId: 'sec-1',
  secretary: { id: 'sec-1', name: 'Secretaria de Educação' },
  periodStart: new Date('2026-01-01'),
  periodEnd: new Date('2026-01-31'),
  totalBilled: 10000,
  totalNet: 9500,
  totalPaid: 5000,
  status: 'PENDING' as const,
  paymentProofUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('GET /api/financial/summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([mockInvoice] as never)
  })

  it('retorna 200 com totalizadores para MAIN_MANAGER', async () => {
    const req = new NextRequest('http://localhost/api/financial/summary', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await summaryGET(req)
    expect(res.status).toBe(200)
    const data = await res.json() as {
      totalBilled: number
      totalNet: number
      totalPaid: number
      bySecretary: unknown[]
    }
    expect(typeof data.totalBilled).toBe('number')
    expect(typeof data.totalNet).toBe('number')
    expect(typeof data.totalPaid).toBe('number')
    expect(Array.isArray(data.bySecretary)).toBe(true)
  })

  it('retorna 200 para SECRETARY_MANAGER', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(secretaryManager as never)
    const req = new NextRequest('http://localhost/api/financial/summary', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await summaryGET(req)
    expect(res.status).toBe(200)
  })

  it('retorna 200 para AUDIT_VIEWER', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(auditViewer as never)
    const req = new NextRequest('http://localhost/api/financial/summary', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await summaryGET(req)
    expect(res.status).toBe(200)
  })

  it('agrega corretamente os totais', async () => {
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([
      { ...mockInvoice, totalBilled: 5000, totalNet: 4500, totalPaid: 2500 },
      { ...mockInvoice, id: 'inv-2', totalBilled: 3000, totalNet: 2800, totalPaid: 3000 },
    ] as never)
    const req = new NextRequest('http://localhost/api/financial/summary', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await summaryGET(req)
    const data = await res.json() as { totalBilled: number; totalPaid: number }
    expect(data.totalBilled).toBe(8000)
    expect(data.totalPaid).toBe(5500)
  })

  it('retorna 403 para SECRETARY_USER', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(secretaryUser as never)
    const req = new NextRequest('http://localhost/api/financial/summary', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await summaryGET(req)
    expect(res.status).toBe(403)
  })

  it('retorna 401 sem autenticação', async () => {
    vi.mocked(verifyToken).mockRejectedValue(new Error('invalid'))
    const req = new NextRequest('http://localhost/api/financial/summary')
    const res = await summaryGET(req)
    expect(res.status).toBe(401)
  })
})

describe('GET /api/financial/invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([mockInvoice] as never)
    vi.mocked(prisma.invoice.count).mockResolvedValue(1)
  })

  it('retorna 200 lista paginada para MAIN_MANAGER', async () => {
    const req = new NextRequest('http://localhost/api/financial/invoices', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await listInvoicesGET(req)
    expect(res.status).toBe(200)
    const data = await res.json() as { data: unknown[]; total: number }
    expect(Array.isArray(data.data)).toBe(true)
    expect(typeof data.total).toBe('number')
  })

  it('retorna 200 para SECRETARY_MANAGER', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(secretaryManager as never)
    const req = new NextRequest('http://localhost/api/financial/invoices', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await listInvoicesGET(req)
    expect(res.status).toBe(200)
  })

  it('retorna 403 para SECRETARY_USER', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(secretaryUser as never)
    const req = new NextRequest('http://localhost/api/financial/invoices', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await listInvoicesGET(req)
    expect(res.status).toBe(403)
    const data = await res.json() as { error: string }
    expect(data.error).toContain('Acesso não autorizado')
  })

  it('retorna 401 sem autenticação', async () => {
    vi.mocked(verifyToken).mockRejectedValue(new Error('invalid'))
    const req = new NextRequest('http://localhost/api/financial/invoices')
    const res = await listInvoicesGET(req)
    expect(res.status).toBe(401)
  })
})

describe('POST /api/financial/invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mainManager as never)
    vi.mocked(prisma.invoice.create).mockResolvedValue(mockInvoice as never)
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
      ...mockInvoice,
      items: [],
    } as never)
    vi.mocked(prisma.invoiceItem.createMany).mockResolvedValue({ count: 0 })
  })

  it('retorna 201 para MAIN_MANAGER com dados válidos', async () => {
    const req = makeRequest('POST', {
      secretaryId: 'sec-1',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      totalBilled: 10000,
      totalNet: 9500,
      totalPaid: 0,
    }, 'http://localhost/api/financial/invoices')
    const res = await createInvoicePOST(req)
    expect(res.status).toBe(201)
    expect(prisma.invoice.create).toHaveBeenCalledOnce()
  })

  it('cria itens via createMany quando items[] enviado', async () => {
    const req = makeRequest('POST', {
      secretaryId: 'sec-1',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      items: [
        { itemName: 'Serviço de TI', quantity: 1, unitPrice: 5000, total: 5000 },
      ],
    }, 'http://localhost/api/financial/invoices')
    await createInvoicePOST(req)
    expect(prisma.invoiceItem.createMany).toHaveBeenCalledOnce()
  })

  it('retorna 422 se campos obrigatórios faltando', async () => {
    const req = makeRequest('POST', { totalBilled: 100 }, 'http://localhost/api/financial/invoices')
    const res = await createInvoicePOST(req)
    expect(res.status).toBe(422)
    const data = await res.json() as { error: string }
    expect(data.error).toContain('obrigatórios')
  })

  it('retorna 403 para SECRETARY_MANAGER', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(secretaryManager as never)
    const req = makeRequest('POST', {
      secretaryId: 'sec-1',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
    }, 'http://localhost/api/financial/invoices')
    const res = await createInvoicePOST(req)
    expect(res.status).toBe(403)
    const data = await res.json() as { error: string }
    expect(data.error).toContain('Acesso não autorizado')
  })

  it('retorna 403 para SECRETARY_USER', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(secretaryUser as never)
    const req = makeRequest('POST', {
      secretaryId: 'sec-1',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
    }, 'http://localhost/api/financial/invoices')
    const res = await createInvoicePOST(req)
    expect(res.status).toBe(403)
  })

  it('retorna 401 sem autenticação', async () => {
    vi.mocked(verifyToken).mockRejectedValue(new Error('invalid'))
    const req = makeRequest('POST', {}, 'http://localhost/api/financial/invoices')
    const res = await createInvoicePOST(req)
    expect(res.status).toBe(401)
  })
})
