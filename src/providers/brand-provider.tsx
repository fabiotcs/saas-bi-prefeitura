'use client'

import { useEffect } from 'react'

export interface BrandConfig {
  id: string
  logoUrl: string
  primaryColor: string
  secondaryColor: string
  faviconUrl: string
  municipalityName: string
}

interface BrandProviderProps {
  children?: React.ReactNode
  config: BrandConfig | null
}

/** Converte hex (#RRGGBB) para string HSL sem wrapper — formato exigido pelo Tailwind */
function hexToHsl(hex: string): string | null {
  const m = hex.replace('#', '').match(/.{2}/g)
  if (!m || m.length < 3) return null
  const r = parseInt(m[0], 16) / 255
  const g = parseInt(m[1], 16) / 255
  const b = parseInt(m[2], 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

export function BrandProvider({ children, config }: BrandProviderProps) {
  useEffect(() => {
    if (!config) return
    const root = document.documentElement
    const primary = hexToHsl(config.primaryColor) ?? config.primaryColor
    const secondary = hexToHsl(config.secondaryColor) ?? config.secondaryColor
    root.style.setProperty('--primary', primary)
    root.style.setProperty('--secondary', secondary)
  }, [config])

  return <>{children}</>
}
