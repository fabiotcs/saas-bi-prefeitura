import { api } from '@/lib/api'
import type { UserRole } from '@prisma/client'

export interface UserSummary {
  id: string
  fullName: string
  email: string
  role: UserRole
  photoUrl: string | null
  lastLogin: string | null
  biometricVerified: boolean
}

export interface UserDetail extends UserSummary {
  birthDate: string
  phone: string
  cpf: string
  rg: string
  secretaryId: string | null
  documentVerified: boolean
  createdAt: string
  updatedAt: string
}

export interface ListUsersParams {
  search?: string
  email?: string
  page?: number
  limit?: number
}

export interface CreateUserPayload {
  fullName: string
  birthDate: string
  phone: string
  email: string
  cpf: string
  rg: string
  role: UserRole
  secretaryId?: string
  password?: string
}

export async function listUsers(params: ListUsersParams = {}) {
  const { data } = await api.get<{ data: UserSummary[]; total: number; page: number; limit: number }>(
    '/api/users',
    { params }
  )
  return data
}

export async function getUserById(id: string) {
  const { data } = await api.get<UserDetail>(`/api/users/${id}`)
  return data
}

export async function createUser(payload: CreateUserPayload) {
  const { data } = await api.post<UserSummary>('/api/users', payload)
  return data
}

export async function updateUser(id: string, payload: Partial<Pick<UserDetail, 'fullName' | 'phone' | 'role' | 'secretaryId'>>) {
  const { data } = await api.patch<UserSummary>(`/api/users/${id}`, payload)
  return data
}

export async function uploadUserPhoto(id: string, photo: File) {
  const formData = new FormData()
  formData.append('photo', photo)
  const { data } = await api.post<{ photoUrl: string }>(`/api/users/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
