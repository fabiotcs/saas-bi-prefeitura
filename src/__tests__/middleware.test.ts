import { describe, it, expect, vi } from 'vitest'
import { middleware } from '@/middleware'
import { NextRequest } from 'next/server'

// Mock jose to avoid Edge Runtime dependencies in Vitest (jsdom)
vi.mock('jose', () => ({
  jwtVerify: vi.fn().mockRejectedValue(new Error('invalid token')),
}))

function buildRequest(path: string, options: { cookie?: string; authorization?: string } = {}) {
  const url = `http://localhost:3000${path}`
  const headers = new Headers()
  if (options.authorization) {
    headers.set('authorization', options.authorization)
  }
  if (options.cookie) {
    headers.set('cookie', `access_token=${options.cookie}`)
  }
  return new NextRequest(url, { headers })
}

describe('middleware', () => {
  it('redirects /dashboard to /login when no token is present', async () => {
    const req = buildRequest('/dashboard')
    const res = await middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('redirects /secretaries to /login when no token is present', async () => {
    const req = buildRequest('/secretaries')
    const res = await middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('includes the original path in the redirect query param', async () => {
    const req = buildRequest('/dashboard')
    const res = await middleware(req)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('from=%2Fdashboard')
  })

  it('redirects to /login when JWT token is invalid', async () => {
    // jose.jwtVerify is mocked to reject above
    const req = buildRequest('/dashboard', { cookie: 'invalid.token.here' })
    const res = await middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })
})
