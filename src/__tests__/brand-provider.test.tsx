import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import { BrandProvider } from '@/providers/brand-provider'
import type { BrandConfig } from '@/providers/brand-provider'

const mockConfig: BrandConfig = {
  id: 'test-id',
  logoUrl: '/logo.png',
  primaryColor: '#1E40AF',
  secondaryColor: '#1E3A8A',
  faviconUrl: '/favicon.ico',
  municipalityName: 'Prefeitura Municipal de Araçuaí',
}

describe('BrandProvider', () => {
  beforeEach(() => {
    // Reset any inline styles on documentElement
    document.documentElement.style.removeProperty('--primary')
    document.documentElement.style.removeProperty('--secondary')
  })

  it('injects --primary CSS variable from brandConfig', () => {
    render(
      React.createElement(BrandProvider, { config: mockConfig }, React.createElement('div'))
    )
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('226 71% 40%')
  })

  it('injects --secondary CSS variable from brandConfig', () => {
    render(
      React.createElement(BrandProvider, { config: mockConfig }, React.createElement('div'))
    )
    expect(document.documentElement.style.getPropertyValue('--secondary')).toBe('224 64% 33%')
  })

  it('does not throw when config is null', () => {
    expect(() => {
      render(
        React.createElement(BrandProvider, { config: null }, React.createElement('div'))
      )
    }).not.toThrow()
  })

  it('renders children', () => {
    const { getByText } = render(
      React.createElement(
        BrandProvider,
        { config: mockConfig },
        React.createElement('span', null, 'child content')
      )
    )
    expect(getByText('child content')).toBeTruthy()
  })
})
