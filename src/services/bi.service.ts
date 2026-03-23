import { api } from '@/lib/api'

export type BIPeriod = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
export type BIExportFormat = 'PDF' | 'EXCEL' | 'CSV'

export interface BIDailyBudget {
  date: string
  count: number
  value: number
}

export interface BIOrderStatus {
  status: string
  count: number
}

export interface BIConsumptionBySecretary {
  secretary: string
  value: number
}

export interface BITopItem {
  name: string
  occurrences: number
  totalValue: number
}

export interface BIData {
  period: string
  totalConsumed: number
  ordersInProgress: number
  ordersCancelledOrDisputed: number
  dailyAcceptedBudgets: BIDailyBudget[]
  ordersByStatus: BIOrderStatus[]
  consumptionBySecretary: BIConsumptionBySecretary[]
  topItems: BITopItem[]
}

export async function getBIData(period: BIPeriod = 'MONTHLY'): Promise<BIData> {
  const { data } = await api.get<BIData>('/api/bi/data', { params: { period } })
  return data
}

export async function exportBIData(period: BIPeriod, format: BIExportFormat): Promise<Blob> {
  const response = await api.get('/api/bi/export', {
    params: { period, format },
    responseType: 'blob',
  })
  return response.data as Blob
}

export async function exportChartPdf(period: BIPeriod): Promise<Blob> {
  return exportBIData(period, 'PDF')
}
