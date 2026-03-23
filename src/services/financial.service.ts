import { api } from '@/lib/api'

export type InvoiceStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE'

export interface Invoice {
  id: string
  secretaryId: string
  secretary?: { id: string; name: string }
  periodStart: string
  periodEnd: string
  totalBilled: number
  totalNet: number
  totalPaid: number
  status: InvoiceStatus
  paymentProofUrl?: string | null
  items?: InvoiceItem[]
  payments?: PaymentHistory[]
  createdAt: string
}

export interface InvoiceItem {
  id: string
  orderId?: string | null
  itemName: string
  quantity: number
  unitPrice: number
  total: number
}

export interface PaymentHistory {
  id: string
  amount: number
  paidAt: string
  proofUrl?: string | null
}

export interface FinancialSummary {
  totalBilled: number
  totalNet: number
  totalPaid: number
  bySecretary: { secretaryId: string; name: string; total: number }[]
}

export async function getFinancialSummary(from?: string, to?: string) {
  const { data } = await api.get<FinancialSummary>('/api/financial/summary', { params: { from, to } })
  return data
}

export async function listInvoices(params: { secretaryId?: string; status?: InvoiceStatus; from?: string; to?: string; page?: number } = {}) {
  const { data } = await api.get<{ data: Invoice[]; total: number }>('/api/financial/invoices', { params })
  return data
}

export async function getInvoiceById(id: string) {
  const { data } = await api.get<Invoice>(`/api/financial/invoices/${id}`)
  return data
}

export async function createInvoice(input: Omit<Invoice, 'id' | 'createdAt' | 'items' | 'payments' | 'secretary'>) {
  const { data } = await api.post<Invoice>('/api/financial/invoices', input)
  return data
}

export async function uploadPaymentProof(id: string, file: File) {
  const form = new FormData()
  form.append('proof', file)
  const { data } = await api.post<{ proofUrl: string }>(`/api/financial/invoices/${id}/proof`, form)
  return data
}
