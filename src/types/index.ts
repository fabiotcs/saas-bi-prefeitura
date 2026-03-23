export type UserRole = 'MAIN_MANAGER' | 'SECRETARY_MANAGER' | 'SECRETARY_USER' | 'AUDIT_VIEWER'
export type OrderStatus = 'AWAITING_OFFERS' | 'AWAITING_NF' | 'IN_PROGRESS' | 'AWAITING_APPROVAL' | 'FINISHED' | 'CANCELLED'
export type FraudAlertLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
export type BiometricStatus = 'SUCCESS' | 'FAILED' | 'SUSPICIOUS'
export type AuditStatus = 'SUCCESS' | 'FAILED' | 'SUSPICIOUS'
export type InvoiceStatus = 'PAID' | 'OVERDUE' | 'PARTIALLY_PAID' | 'PENDING'

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
