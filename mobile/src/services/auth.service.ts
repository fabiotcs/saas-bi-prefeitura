import { mobileApi } from './api'
import { saveTokens, saveUser, clearTokens, type StoredUser } from './secure-storage'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  challengeToken: string
  message: string
}

export interface BiometricVerifyRequest {
  challengeToken: string
  imageData: string
}

export interface BiometricVerifyResponse {
  accessToken: string
  refreshToken?: string
  user: StoredUser
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await mobileApi.post<LoginResponse>('/api/auth/login', credentials)
  return response.data
}

export async function verifyBiometric(data: BiometricVerifyRequest): Promise<BiometricVerifyResponse> {
  const response = await mobileApi.post<BiometricVerifyResponse>('/api/auth/biometric-verify', data)
  const { accessToken, refreshToken, user } = response.data
  await saveTokens(accessToken, refreshToken)
  await saveUser(user)
  return response.data
}

export async function logout(): Promise<void> {
  try {
    await mobileApi.post('/api/auth/logout')
  } catch {
    // Ignore logout API errors — always clear local tokens
  } finally {
    await clearTokens()
  }
}
