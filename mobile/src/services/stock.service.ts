import { mobileApi } from './api'

export type AbcClass = 'A' | 'B' | 'C'

export interface StockItem {
  id: string
  name: string
  quantity: number
  unit: string
  unitPrice: number
  minimumAlert: number
  abcClass?: AbcClass | null
  imageUrl?: string | null
  barcode?: string | null
  storageLocation?: { id: string; name: string } | null
  createdAt: string
}

export interface StockDashboard {
  totalItems: number
  lowStockCount: number
  totalValue: number
  abcBreakdown: { class: string; count: number; value: number }[]
}

export interface StockMovement {
  id: string
  type: 'IN' | 'OUT' | 'TRANSFER'
  quantity: number
  reason?: string | null
  stockItem: { id: string; name: string; unit: string }
  createdAt: string
  createdBy?: { id: string; fullName: string } | null
}

export async function getStockDashboard(): Promise<StockDashboard> {
  const response = await mobileApi.get<StockDashboard>('/api/stock/dashboard')
  return response.data
}

export async function getStockItems(search?: string): Promise<StockItem[]> {
  const params: Record<string, string> = {}
  if (search) params.search = search
  const response = await mobileApi.get<{ data: StockItem[]; total: number }>('/api/stock/items', { params })
  return response.data.data ?? []
}

export async function getStockMovements(): Promise<StockMovement[]> {
  const response = await mobileApi.get<{ data: StockMovement[]; total: number }>('/api/stock/movements', {
    params: { limit: 50 },
  })
  return response.data.data ?? []
}
