import { api } from '@/lib/api'
import type { BiometricStatus, FraudAlertLevel } from '@prisma/client'

export interface BiometricRecordUser {
  fullName: string
  email: string
  photoUrl: string | null
}

export interface BiometricRecordWithUser {
  id: string
  userId: string
  capturedImageUrl: string
  documentPhotoUrl: string | null
  similarityScore: number
  livenessScore: number
  confidenceLevel: number
  fraudAlertLevel: FraudAlertLevel
  aiEstimatedAge: number | null
  aiEstimatedGender: string | null
  documentMatch: boolean
  ipAddress: string
  status: BiometricStatus
  createdAt: string
  user: BiometricRecordUser
}

export interface BiometricHistoryParams {
  userId?: string
  status?: BiometricStatus
  from?: string
  to?: string
  page?: number
  limit?: number
}

export interface BiometricHistoryResponse {
  data: BiometricRecordWithUser[]
  total: number
  page: number
  limit: number
}

export async function listBiometricHistory(
  params: BiometricHistoryParams = {}
): Promise<BiometricHistoryResponse> {
  const { data } = await api.get('/api/auth/biometric-history', { params })
  return data as BiometricHistoryResponse
}
