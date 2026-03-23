import { api } from '@/lib/api'

export type EstablishmentStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

export interface Establishment {
  id: string
  name: string
  cnpj: string
  address: string
  city: string
  state: string
  lat?: number | null
  lng?: number | null
  phone: string
  email?: string | null
  servicesDescription: string
  ordersCompleted: number
  rating: number
  status: EstablishmentStatus
  isFavorite: boolean
  createdAt: string
  updatedAt: string
}

export interface ListEstablishmentsParams {
  search?: string
  city?: string
  state?: string
  page?: number
  limit?: number
}

export async function listEstablishments(params: ListEstablishmentsParams = {}) {
  const { data } = await api.get<{ data: Establishment[]; total: number; page: number; limit: number }>(
    '/api/establishments',
    { params }
  )
  return data
}

export async function getEstablishmentById(id: string): Promise<Establishment> {
  const { data } = await api.get<Establishment>(`/api/establishments/${id}`)
  return data
}

export async function toggleFavorite(id: string, favorite: boolean): Promise<{ isFavorite: boolean }> {
  const { data } = await api.patch<{ isFavorite: boolean }>(
    `/api/establishments/${id}/favorite`,
    { favorite }
  )
  return data
}

export async function createEstablishment(payload: {
  name: string
  cnpj: string
  address?: string
  city?: string
  state?: string
  phone?: string
  email?: string
  servicesDescription?: string
}): Promise<Establishment> {
  const { data } = await api.post<Establishment>('/api/establishments', payload)
  return data
}
