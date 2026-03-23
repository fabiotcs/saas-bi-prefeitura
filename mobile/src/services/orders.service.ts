import { mobileApi } from './api'

export interface MobileOrder {
  id: string
  code: string
  description: string
  status: 'OPEN' | 'IN_QUOTATION' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  createdAt: string
  secretaria: { id: string; name: string }
}

export interface OrdersResponse {
  orders: MobileOrder[]
  total: number
}

export async function getOrders(status?: string): Promise<MobileOrder[]> {
  const params: Record<string, string> = {}
  if (status) params.status = status

  const response = await mobileApi.get<OrdersResponse>('/api/orders', { params })
  return response.data.orders ?? []
}

export async function getOrderById(id: string): Promise<MobileOrder> {
  const response = await mobileApi.get<MobileOrder>(`/api/orders/${id}`)
  return response.data
}
