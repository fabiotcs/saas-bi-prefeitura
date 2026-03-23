import { api } from '@/lib/api'

export interface StockDashboard {
  totalProducts: number
  totalItems: number
  totalValue: number
  lowStockItems: number
}

export interface StockItem {
  id: string
  name: string
  imageUrl?: string | null
  quantity: number
  unit: string
  unitPrice: number
  minimumAlert: number
  barcode?: string | null
  qrCode?: string | null
  storageLocationId?: string | null
  storageLocation?: { id: string; name: string } | null
  abcClass?: 'A' | 'B' | 'C' | null
  createdAt: string
  updatedAt: string
}

export interface ListInventoryParams {
  search?: string
  barcode?: string
  page?: number
  limit?: number
}

export async function getStockDashboard(): Promise<StockDashboard> {
  const { data } = await api.get<StockDashboard>('/api/stock/dashboard')
  return data
}

export async function listInventory(params: ListInventoryParams = {}) {
  const { data } = await api.get<{ data: StockItem[]; total: number }>('/api/stock/inventory', { params })
  return data
}
