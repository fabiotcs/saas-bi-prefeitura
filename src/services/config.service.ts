import { api } from '@/lib/api'

export interface BrandConfig {
  id: string
  logoUrl: string
  primaryColor: string
  secondaryColor: string
  faviconUrl: string
  municipalityName: string
}

export const fetchBrandConfig = () =>
  api.get<BrandConfig>('/api/config/brand').then(r => r.data)

export const updateBrandConfig = (data: Partial<BrandConfig>) =>
  api.patch<BrandConfig>('/api/config/brand', data).then(r => r.data)
