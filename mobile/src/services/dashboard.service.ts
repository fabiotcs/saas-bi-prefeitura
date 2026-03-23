import { mobileApi } from './api'

export interface MobileDashboard {
  totalBudget: number
  openOrders: number
  completedOrders: number
  recentOrders: Array<{
    id: string
    code: string
    status: string
    createdAt: string
  }>
}

export async function getDashboardData(): Promise<MobileDashboard> {
  const response = await mobileApi.get<MobileDashboard>('/api/dashboard')
  return response.data
}
