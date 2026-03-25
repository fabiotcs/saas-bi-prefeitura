import { mobileApi } from './api'

export type OrderStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'IN_QUOTATION'
  | 'APPROVED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'

export type OrderCategory = 'MATERIAL' | 'SERVICE' | 'EQUIPMENT'

export interface MobileOrderItem {
  id?: string
  name: string
  unit: string
  quantity: number
  referenceValue: number
  imageUrl?: string | null
}

export interface MobileDeliveryLocation {
  id?: string
  name: string
  zipCode: string
  address: string
  city: string
  state: string
}

export interface MobileOrder {
  id: string
  code: string
  name: string
  category: OrderCategory
  status: OrderStatus
  secretaryId: string
  secretary?: { id: string; name: string }
  investmentArea: string
  receiverName: string
  observations?: string
  desiredDeliveryDate?: string
  createdAt: string
  updatedAt: string
  items?: MobileOrderItem[]
  deliveryLocations?: MobileDeliveryLocation[]
  _count?: { chatMessages: number }
}

export interface CreateOrderPayload {
  name: string
  category: OrderCategory
  secretaryId: string
  investmentArea: string
  receiverName: string
  observations?: string
  items: Omit<MobileOrderItem, 'id'>[]
  deliveryLocations: Omit<MobileDeliveryLocation, 'id'>[]
}

export async function getOrders(status?: string): Promise<MobileOrder[]> {
  const params: Record<string, string> = {}
  if (status) params.status = status
  const response = await mobileApi.get<{ data: MobileOrder[]; total: number }>('/api/orders', { params })
  return response.data.data ?? []
}

export async function getOrderById(id: string): Promise<MobileOrder> {
  const response = await mobileApi.get<MobileOrder>(`/api/orders/${id}`)
  return response.data
}

export async function createOrder(payload: CreateOrderPayload): Promise<MobileOrder> {
  const response = await mobileApi.post<MobileOrder>('/api/orders', payload)
  return response.data
}

export async function approveOrder(id: string): Promise<void> {
  await mobileApi.post(`/api/orders/${id}/approve`)
}

export async function searchItemsCatalog(q: string): Promise<{
  id: string
  name: string
  unit: string
  referenceValue: number
  imageUrl?: string | null
  category?: string | null
}[]> {
  const response = await mobileApi.get<{ data: { id: string; name: string; unit: string; referenceValue: number; imageUrl?: string | null; category?: string | null }[] }>('/api/items/search', { params: { q } })
  return response.data.data ?? []
}
