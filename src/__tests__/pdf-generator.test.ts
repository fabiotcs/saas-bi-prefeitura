import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
    },
  },
}))

// Mock JWT
vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}))

// Mock pdf-generator to avoid pdfkit binary issues in test env
vi.mock('@/lib/pdf-generator', () => ({
  generateOrderPdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 mock')),
}))

describe('POST /api/orders/[id]/print', () => {
  let prisma: Awaited<typeof import('@/lib/prisma')>['prisma']
  let verifyToken: Awaited<typeof import('@/lib/jwt')>['verifyToken']
  let generateOrderPdf: Awaited<typeof import('@/lib/pdf-generator')>['generateOrderPdf']
  let POST: (
    req: NextRequest,
    ctx: { params: { id: string } }
  ) => Promise<Response>

  beforeEach(async () => {
    ;({ prisma } = await import('@/lib/prisma'))
    ;({ verifyToken } = await import('@/lib/jwt'))
    ;({ generateOrderPdf } = await import('@/lib/pdf-generator'))
    ;({ POST } = await import('@/app/api/orders/[id]/print/route'))
  })
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function makeRequest(token?: string) {
    return new NextRequest('http://localhost/api/orders/order-1/print', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  }

  const mockOrder = {
    id: 'order-1',
    code: 'OS-2026-001',
    name: 'Ordem Teste',
    category: 'MATERIAL',
    status: 'OPEN',
    observations: null,
    secretary: { id: 's1', name: 'Secretaria de Saúde' },
    subSecretary: null,
    createdBy: { id: 'u1', fullName: 'Gestor Teste', photoUrl: null },
    createdAt: new Date('2026-01-01'),
    investmentArea: 'Saúde',
    receiverName: 'João Silva',
    items: [
      { id: 'i1', name: 'Caneta', unit: 'UN', quantity: 10, referenceValue: 2.5 },
    ],
    timeline: [
      {
        id: 't1',
        step: 'CREATED',
        occurredAt: new Date('2026-01-01'),
        user: { id: 'u1', fullName: 'Gestor Teste', photoUrl: null },
      },
    ],
    deliveryLocations: [],
    invoices: [],
    quotationStartDate: null,
    quotationEndDate: null,
    desiredDeliveryDate: null,
    specificMunicipality: null,
    regionRadius: null,
  }

  it('returns 401 when no token provided', async () => {
    const res = await POST(makeRequest(), { params: { id: 'order-1' } })
    expect(res.status).toBe(401)
  })

  it('returns 401 when token is invalid', async () => {
    vi.mocked(verifyToken).mockRejectedValue(new Error('invalid'))
    const res = await POST(makeRequest('bad-token'), { params: { id: 'order-1' } })
    expect(res.status).toBe(401)
  })

  it('returns 404 when order not found', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'u1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      email: 'user@test.com',
      fullName: 'User Test',
      role: 'MAIN_MANAGER',
    } as never)
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null)

    const res = await POST(makeRequest('valid-token'), { params: { id: 'nonexistent' } })
    expect(res.status).toBe(404)
  })

  it('returns PDF binary (application/pdf) for valid authenticated user', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'u1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      email: 'manager@test.com',
      fullName: 'Manager Test',
      role: 'MAIN_MANAGER',
    } as never)
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as never)

    const res = await POST(makeRequest('valid-token'), { params: { id: 'order-1' } })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toContain('OS-2026-001.pdf')
  })

  it('calls generateOrderPdf with correct SHA-256 document hash', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'u1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      email: 'manager@test.com',
      fullName: 'Manager Test',
      role: 'MAIN_MANAGER',
    } as never)
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as never)

    await POST(makeRequest('valid-token'), { params: { id: 'order-1' } })

    expect(generateOrderPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'OS-2026-001',
        status: 'OPEN',
        documentHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        signerName: 'Manager Test',
        signerRole: 'MAIN_MANAGER',
      }),
    )
  })
})
