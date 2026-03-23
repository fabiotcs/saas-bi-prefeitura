import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest'
import { NextRequest } from 'next/server'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    stockItem: {
      count: vi.fn(),
      findMany: vi.fn(),
      fields: { minQuantity: 'minQuantity' },
    },
    stockMovement: {
      groupBy: vi.fn(),
    },
  },
}))

// Mock JWT
vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}))

// Mock mailer
vi.mock('@/lib/mailer', () => ({
  mailer: {
    sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
  },
  FROM_ADDRESS: 'noreply@test.com',
  buildStockEmailHtml: vi.fn().mockReturnValue('<html>test</html>'),
}))

describe('POST /api/stock/email-report', () => {
  let prisma: Awaited<typeof import('@/lib/prisma')>['prisma']
  let verifyToken: Awaited<typeof import('@/lib/jwt')>['verifyToken']
  let mailer: Awaited<typeof import('@/lib/mailer')>['mailer']
  let POST: Awaited<typeof import('@/app/api/stock/email-report/route')>['POST']

  beforeEach(async () => {
    ;({ prisma } = await import('@/lib/prisma'))
    ;({ verifyToken } = await import('@/lib/jwt'))
    ;({ mailer } = await import('@/lib/mailer'))
    ;({ POST } = await import('@/app/api/stock/email-report/route'))
  })
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function makeRequest(token?: string) {
    return new NextRequest('http://localhost/api/stock/email-report', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  }

  it('returns 401 when no token provided', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 401 when token is invalid', async () => {
    vi.mocked(verifyToken).mockRejectedValue(new Error('invalid'))
    const res = await POST(makeRequest('bad-token'))
    expect(res.status).toBe(401)
  })

  it('returns 403 when user role is not allowed', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'u1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      email: 'user@test.com',
      fullName: 'User Test',
      role: 'SECRETARY_USER',
    } as never)

    const res = await POST(makeRequest('valid-token'))
    expect(res.status).toBe(403)
  })

  it('sends email and returns 200 for MAIN_MANAGER', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'u1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      email: 'manager@test.com',
      fullName: 'Manager Test',
      role: 'MAIN_MANAGER',
    } as never)
    vi.mocked(prisma.stockItem.count).mockResolvedValue(50)
    vi.mocked(prisma.stockItem.findMany).mockResolvedValue([
      { id: 'i1', name: 'Item A', abcClass: 'A' },
      { id: 'i2', name: 'Item B', abcClass: 'B' },
    ] as never)
    vi.mocked(prisma.stockMovement.groupBy).mockResolvedValue([
      { itemId: 'i1', _count: { id: 10 } },
    ] as never)

    const res = await POST(makeRequest('valid-token'))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.message).toContain('sucesso')
    expect(mailer.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'manager@test.com',
        subject: expect.stringContaining('Resumo Semanal'),
      }),
    )
  })

  it('sends email for SECRETARY_MANAGER', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'u2', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u2',
      email: 'secretary@test.com',
      fullName: 'Secretary Test',
      role: 'SECRETARY_MANAGER',
    } as never)
    vi.mocked(prisma.stockItem.count).mockResolvedValue(20)
    vi.mocked(prisma.stockItem.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.stockMovement.groupBy).mockResolvedValue([] as never)

    const res = await POST(makeRequest('valid-token'))
    expect(res.status).toBe(200)
  })
})
