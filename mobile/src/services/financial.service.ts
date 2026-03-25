import { mobileApi } from './api'

export type InvoiceStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE'

export interface Invoice {
  id: string
  secretary?: { id: string; name: string }
  totalAmount: number
  paidAmount: number
  status: InvoiceStatus
  dueDate?: string | null
  referenceMonth?: string | null
  createdAt: string
}

export interface FinancialSummary {
  totalBudget: number
  committed: number
  available: number
  pendingInvoices: number
  overdueInvoices: number
}

export async function getFinancialSummary(): Promise<FinancialSummary> {
  const response = await mobileApi.get<FinancialSummary>('/api/financial/summary')
  return response.data
}

export async function getInvoices(): Promise<Invoice[]> {
  const response = await mobileApi.get<{ data: Invoice[]; total: number }>('/api/financial/invoices', {
    params: { limit: 50 },
  })
  return response.data.data ?? []
}
