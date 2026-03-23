import { api } from '@/lib/api'

export type ReportType =
  | 'ORDERS'
  | 'ESTABLISHMENTS'
  | 'PRODUCT_VALUE'
  | 'EXPENSES_BY_PERIOD'
  | 'TOP_PRODUCTS'
  | 'OPERATIONS_LOG'

export type ReportFormat = 'PDF' | 'EXCEL' | 'CSV'

export interface ReportFilters {
  from?: string
  to?: string
  secretaryId?: string
  status?: string
  productName?: string
  userId?: string
  sortBy?: string
}

export interface ReportPreview {
  columns: string[]
  rows: Record<string, unknown>[]
}

export async function previewReport(
  type: ReportType,
  filters: ReportFilters = {}
): Promise<ReportPreview> {
  const params = new URLSearchParams({ type, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')) })
  const { data } = await api.get<ReportPreview>(`/api/reports/preview?${params.toString()}`)
  return data
}

export async function generateReport(
  type: ReportType,
  filters: ReportFilters = {},
  format: ReportFormat = 'CSV'
): Promise<Blob> {
  const params = new URLSearchParams({
    type,
    format,
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')),
  })
  const response = await api.get(`/api/reports/export?${params.toString()}`, {
    responseType: format === 'CSV' ? 'blob' : 'json',
  })

  if (format === 'CSV') {
    return response.data as Blob
  }

  // PDF / EXCEL stub: return JSON as blob for display
  const json = JSON.stringify(response.data)
  return new Blob([json], { type: 'application/json' })
}
