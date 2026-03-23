import { api } from '@/lib/api'
import type { BillingMode } from '@prisma/client'

export interface SystemSettings {
  id: string
  billingMode: BillingMode
  billingClosingDay: number
  requireManagerApproval: boolean
  requireBudgetValidation: boolean
  minimumProposalsForApproval: number
  restrictOrderCreationToVerifiedUsers: boolean
  updatedAt: string
}

export type UpdateSettingsDto = Partial<Omit<SystemSettings, 'id' | 'updatedAt'>>

export async function getSettings(): Promise<SystemSettings> {
  const { data } = await api.get<SystemSettings>('/api/settings')
  return data
}

export async function updateSettings(dto: UpdateSettingsDto): Promise<SystemSettings> {
  const { data } = await api.patch<SystemSettings>('/api/settings', dto)
  return data
}
