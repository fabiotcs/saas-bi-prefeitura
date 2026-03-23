import { describe, it, expect } from 'vitest'

describe('Story 1.1 — Smoke tests', () => {
  it('utils cn() function works', async () => {
    const { cn } = await import('@/lib/utils')
    expect(cn('foo', 'bar')).toBe('foo bar')
    expect(cn('a', { b: true, c: false })).toBe('a b')
  })

  it('types are exportable', async () => {
    const types = await import('@/types/index')
    expect(types).toBeDefined()
  })
})
