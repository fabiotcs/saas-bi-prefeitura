import { api } from '@/lib/api'

export type OrderStatus = 'DRAFT' | 'OPEN' | 'IN_QUOTATION' | 'APPROVED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED'
export type OrderCategory = 'MATERIAL' | 'SERVICE' | 'EQUIPMENT'

export interface OrderItem {
  id?: string
  name: string
  imageUrl?: string | null
  unit: string
  quantity: number
  referenceValue: number
}

export interface DeliveryLocation {
  id?: string
  name: string
  zipCode: string
  address: string
  city: string
  state: string
}

export interface Order {
  id: string
  code: string
  name: string
  category: OrderCategory
  status: OrderStatus
  secretaryId: string
  secretary?: { id: string; name: string }
  subSecretaryId?: string
  subSecretary?: { id: string; name: string }
  investmentArea: string
  quotationStartDate?: string
  quotationEndDate?: string
  desiredDeliveryDate?: string
  regionRadius?: number
  specificMunicipality?: string
  receiverName: string
  observations?: string
  createdByUserId: string
  createdBy?: { id: string; fullName: string; photoUrl?: string }
  items?: OrderItem[]
  deliveryLocations?: DeliveryLocation[]
  _count?: { chatMessages: number }
  createdAt: string
  updatedAt: string
}

export interface CreateOrderInput {
  name: string
  category: OrderCategory
  secretaryId: string
  subSecretaryId?: string
  investmentArea: string
  quotationStartDate?: string
  quotationEndDate?: string
  desiredDeliveryDate?: string
  regionRadius?: number
  specificMunicipality?: string
  receiverName: string
  observations?: string
  items: Omit<OrderItem, 'id'>[]
  deliveryLocations: Omit<DeliveryLocation, 'id'>[]
}

export interface ListOrdersParams {
  search?: string
  status?: OrderStatus
  secretaryId?: string
  page?: number
  limit?: number
}

export async function listOrders(params: ListOrdersParams = {}) {
  const { data } = await api.get<{ data: Order[]; total: number }>('/api/orders', { params })
  return data
}

export async function createOrder(input: CreateOrderInput) {
  const { data } = await api.post<Order>('/api/orders', input)
  return data
}

export async function getOrderById(id: string) {
  const { data } = await api.get<Order>(`/api/orders/${id}`)
  return data
}

export interface ItemSearchResult {
  id: string
  name: string
  imageUrl?: string | null
  unit: string
  referenceValue: number
  category?: string | null
}

export async function searchItems(q: string) {
  const { data } = await api.get<{ data: ItemSearchResult[] }>('/api/items/search', { params: { q } })
  return data
}
