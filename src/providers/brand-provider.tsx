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

export function BrandProvider({ children, config }: BrandProviderProps) {
  useEffect(() => {
    if (!config) return
    const root = document.documentElement
    root.style.setProperty('--primary', config.primaryColor)
    root.style.setProperty('--secondary', config.secondaryColor)
  }, [config])

  return <>{children}</>
}
