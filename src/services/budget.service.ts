import { api } from '@/lib/api'

export interface BudgetContract {
  id: string
  contractNumber: string
  initialValue: number
  additivesTotal: number
  currentTotal: number
  distributedToSecretaries: number
  allocatedViaCommitment: number
  consumedInOrders: number
  additives?: BudgetAdditive[]
  commitments?: BudgetCommitment[]
  createdAt: string
  updatedAt: string
}

export interface BudgetAdditive {
  id: string
  contractId: string
  value: number
  description: string
  approvedAt: string
  fileUrl?: string | null
  approvedBy?: { id: string; fullName: string }
}

export interface BudgetCommitment {
  id: string
  contractId: string
  secretaryId: string
  secretary?: { id: string; name: string }
  value: number
  usedValue: number
  status: 'ACTIVE' | 'CONSUMED' | 'CANCELLED'
  registeredAt: string
  fileUrl?: string | null
}

export async function listContracts() {
  const { data } = await api.get<{ data: BudgetContract[] }>('/api/budget/contracts')
  return data
}

export async function getContractById(id: string) {
  const { data } = await api.get<BudgetContract>(`/api/budget/contracts/${id}`)
  return data
}

export async function addAdditive(
  contractId: string,
  input: {
    value: number
    description: string
    otpCode: string
    twoFactorRequestId: string
    fileUrl?: string
  }
) {
  const { data } = await api.post<BudgetAdditive>(
    `/api/budget/contracts/${contractId}/additives`,
    input
  )
  return data
}

export async function addCommitment(
  contractId: string,
  input: {
    secretaryId: string
    value: number
    otpCode: string
    twoFactorRequestId: string
    fileUrl?: string
  }
) {
  const { data } = await api.post<BudgetCommitment>(
    `/api/budget/contracts/${contractId}/commitments`,
    input
  )
  return data
}
