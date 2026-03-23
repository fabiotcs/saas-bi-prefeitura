import { api } from '@/lib/api'

export interface ChatMessage {
  id: string
  orderId: string
  senderId: string
  sender: { id: string; fullName: string; photoUrl?: string | null }
  content?: string | null
  imageUrl?: string | null
  senderType: 'PREFECTURE' | 'ESTABLISHMENT'
  sentAt: string
}

export async function listMessages(orderId: string, page = 1, limit = 50) {
  const { data } = await api.get<{ data: ChatMessage[]; total: number }>(
    `/api/orders/${orderId}/chat`,
    { params: { page, limit } }
  )
  return data
}

export async function sendMessage(orderId: string, content: string) {
  const { data } = await api.post<ChatMessage>(`/api/orders/${orderId}/chat`, { content })
  return data
}

export async function sendImageMessage(orderId: string, image: File, content?: string) {
  const form = new FormData()
  form.append('image', image)
  if (content) form.append('content', content)
  const { data } = await api.post<ChatMessage>(`/api/orders/${orderId}/chat`, form)
  return data
}
