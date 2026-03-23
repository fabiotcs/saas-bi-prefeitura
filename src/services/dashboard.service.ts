import { api } from '@/lib/api'

export interface SecretaryBudget {
  id: string
  name: string
  budgetAllocated: number
  budgetUsed: number
  budgetRemaining: number
  percentUsed: number
}

export interface OrdersSummary {
  open: number
  inProgress: number
  pendingApproval: number
  finished: number
  cancelled: number
}

export interface RecentOrder {
  id: string
  code: string
  name: string
  status: string
  createdAt: string
  secretaryId: string
  secretaryName: string
}

export interface DashboardData {
  budgetTotal: number
  budgetUsed: number
  budgetRemaining: number
  secretaryList: SecretaryBudget[]
  ordersSummary: OrdersSummary
  recentOrders: RecentOrder[]
}

export async function fetchDashboard(): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>('/api/dashboard')
  return data
}
