import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { TwoFactorAction } from '@prisma/client'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFindUnique = vi.fn()
const mockUpdate = vi.fn()
const mockCreate = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    twoFactorRequest: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}))

// bcrypt: hash returns predictable value; compare returns true only for 'correct-otp'
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(async (value: string) => `hashed:${value}`),
    compare: vi.fn(async (plain: string) => plain === 'correct-otp'),
  },
}))

// nodemailer: do not actually send emails
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({}),
    })),
  },
}))

// jose: jwtVerify resolves with a test userId / email payload
vi.mock('jose', () => ({
  jwtVerify: vi.fn().mockResolvedValue({
    payload: { sub: 'user-123', email: 'test@aracuai.mg.gov.br' },
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildValidateRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/auth/2fa/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function buildRequestRoute(body: Record<string, unknown>, token = 'valid-token') {
  return new NextRequest('http://localhost:3000/api/auth/2fa/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
}

function makeRecord(overrides: Partial<{
  id: string
  otpHash: string
  expiresAt: Date
  used: boolean
  failCount: number
  blockedUntil: Date | null
}> = {}) {
  return {
    id: 'req-abc',
    userId: 'user-123',
    action: TwoFactorAction.APPROVE_ORDER,
    otpHash: 'hashed:correct-otp',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min from now
    used: false,
    failCount: 0,
    blockedUntil: null,
    createdAt: new Date(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests — validate route
// ---------------------------------------------------------------------------

describe('POST /api/auth/2fa/validate', () => {
  let POST: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    // Dynamic import to ensure mocks are applied before module initialises
    const mod = await import('@/app/api/auth/2fa/validate/route')
    POST = mod.POST
  })

  it('returns { valid: true } for a correct, non-expired OTP', async () => {
    const record = makeRecord()
    mockFindUnique.mockResolvedValue(record)
    mockUpdate.mockResolvedValue({ ...record, used: true })

    const req = buildValidateRequest({ otpToken: 'req-abc', code: 'correct-otp' })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ valid: true })
  })

  it('returns { valid: false, reason: "expired" } for an expired OTP', async () => {
    const record = makeRecord({ expiresAt: new Date(Date.now() - 1000) }) // 1s ago
    mockFindUnique.mockResolvedValue(record)

    const req = buildValidateRequest({ otpToken: 'req-abc', code: 'correct-otp' })
    const res = await POST(req)
    const body = await res.json()

    expect(body.valid).toBe(false)
    expect(body.reason).toBe('expired')
  })

  it('returns { valid: false, reason: "already_used" } for an already-used OTP', async () => {
    const record = makeRecord({ used: true })
    mockFindUnique.mockResolvedValue(record)

    const req = buildValidateRequest({ otpToken: 'req-abc', code: 'correct-otp' })
    const res = await POST(req)
    const body = await res.json()

    expect(body.valid).toBe(false)
    expect(body.reason).toBe('already_used')
  })

  it('returns { valid: false, reason: "invalid_code" } for wrong OTP', async () => {
    const record = makeRecord()
    mockFindUnique.mockResolvedValue(record)
    mockUpdate.mockResolvedValue({ ...record, failCount: 1 })

    const req = buildValidateRequest({ otpToken: 'req-abc', code: 'wrong-otp' })
    const res = await POST(req)
    const body = await res.json()

    expect(body.valid).toBe(false)
    expect(body.reason).toBe('invalid_code')
  })

  it('blocks after 3 consecutive wrong attempts', async () => {
    const record = makeRecord({ failCount: 2 }) // already 2 fails, this is the 3rd
    mockFindUnique.mockResolvedValue(record)
    const blockedUntil = new Date(Date.now() + 5 * 60 * 1000)
    mockUpdate.mockResolvedValue({ ...record, failCount: 3, blockedUntil })

    const req = buildValidateRequest({ otpToken: 'req-abc', code: 'wrong-otp' })
    const res = await POST(req)
    const body = await res.json()

    expect(body.valid).toBe(false)
    expect(body.reason).toBe('blocked')
    expect(body.blockedUntil).toBeDefined()

    // Verify update was called with blockedUntil set
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          failCount: 3,
          blockedUntil: expect.any(Date),
        }),
      })
    )
  })

  it('returns { valid: false, reason: "blocked" } when blockedUntil is in the future', async () => {
    const blockedUntil = new Date(Date.now() + 3 * 60 * 1000)
    const record = makeRecord({ blockedUntil, failCount: 3 })
    mockFindUnique.mockResolvedValue(record)

    const req = buildValidateRequest({ otpToken: 'req-abc', code: 'correct-otp' })
    const res = await POST(req)
    const body = await res.json()

    expect(body.valid).toBe(false)
    expect(body.reason).toBe('blocked')
    expect(body.blockedUntil).toBeDefined()
  })

  it('returns 400 when otpToken or code is missing', async () => {
    const req = buildValidateRequest({ otpToken: 'req-abc' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns { valid: false, reason: "not_found" } for unknown otpToken', async () => {
    mockFindUnique.mockResolvedValue(null)

    const req = buildValidateRequest({ otpToken: 'unknown', code: '123456' })
    const res = await POST(req)
    const body = await res.json()

    expect(body.valid).toBe(false)
    expect(body.reason).toBe('not_found')
  })
})

// ---------------------------------------------------------------------------
// Tests — request route (smoke tests only, SMTP is mocked/logged)
// ---------------------------------------------------------------------------

describe('POST /api/auth/2fa/request', () => {
  let POST: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/app/api/auth/2fa/request/route')
    POST = mod.POST
  })

  it('returns { otpToken, expiresIn: 300 } for a valid request', async () => {
    mockCreate.mockResolvedValue({ id: 'new-req-id' })

    const req = buildRequestRoute({ action: TwoFactorAction.APPROVE_ORDER })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.otpToken).toBe('new-req-id')
    expect(body.expiresIn).toBe(300)
  })

  it('returns 401 when no token is provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/2fa/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: TwoFactorAction.APPROVE_ORDER }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 for an invalid action', async () => {
    const req = buildRequestRoute({ action: 'INVALID_ACTION' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
