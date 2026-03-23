import { api } from '@/lib/api'

export interface Secretary {
  id: string
  name: string
  phone: string
  cnpj: string
  description?: string
  secretaryPersonName: string
  photoUrl?: string
  budgetAllocated: number
  budgetUsed: number
  parentId?: string
  parent?: Pick<Secretary, 'id' | 'name'>
  subSecretaries?: Pick<Secretary, 'id' | 'name'>[]
  _count?: { orders: number }
  createdAt: string
  updatedAt: string
}

export interface CreateSecretaryInput {
  name: string
  phone: string
  cnpj: string
  description?: string
  secretaryPersonName: string
  budgetAllocated?: number
  parentId?: string
}

export interface UpdateSecretaryInput extends Partial<CreateSecretaryInput> {}

export interface ListSecretariesParams {
  search?: string
  page?: number
  limit?: number
}

export async function listSecretaries(params: ListSecretariesParams = {}) {
  const { data } = await api.get<{ data: Secretary[]; total: number }>('/api/secretaries', { params })
  return data
}

export async function createSecretary(input: CreateSecretaryInput) {
  const { data } = await api.post<Secretary>('/api/secretaries', input)
  return data
}

export async function getSecretaryById(id: string) {
  const { data } = await api.get<Secretary>(`/api/secretaries/${id}`)
  return data
}

export async function updateSecretary(id: string, input: UpdateSecretaryInput) {
  const { data } = await api.patch<Secretary>(`/api/secretaries/${id}`, input)
  return data
}

export async function deleteSecretary(id: string) {
  await api.delete(`/api/secretaries/${id}`)
}

export async function uploadSecretaryPhoto(id: string, photo: File) {
  const form = new FormData()
  form.append('photo', photo)
  const { data } = await api.post<{ photoUrl: string }>(`/api/secretaries/${id}/photo`, form)
  return data
}

export async function getFinancialSummary(id: string) {
  const { data } = await api.get<{
    budgetAllocated: number
    budgetUsed: number
    budgetByCommitment: number
    usedInOrders: number
    distributedToSub: number
  }>(`/api/secretaries/${id}/financial-summary`)
  return data
}
