import { api } from '@/lib/api'
import { TwoFactorAction } from '@prisma/client'

export async function requestTwoFactor(action: TwoFactorAction) {
  const { data } = await api.post('/api/auth/2fa/request', { action })
  return data as { otpToken: string; expiresIn: number }
}

export async function validateTwoFactor(otpToken: string, code: string) {
  const { data } = await api.post('/api/auth/2fa/validate', { otpToken, code })
  return data as { valid: boolean; reason?: string; blockedUntil?: string }
}
