import { mobileApi } from './api'

export interface MobileSecretary {
  id: string
  name: string
  parentId?: string | null
  subSecretaries?: { id: string; name: string }[]
}

export async function getSecretaries(): Promise<MobileSecretary[]> {
  const response = await mobileApi.get<{ data: MobileSecretary[]; total: number }>('/api/secretaries', {
    params: { limit: 100 },
  })
  return response.data.data ?? []
}
