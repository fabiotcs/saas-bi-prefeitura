import { api } from '@/lib/api'

export interface ApiKey {
  id: string
  name: string
  permissions: string[]
  lastUsedAt: string | null
  revoked: boolean
  createdAt: string
  createdById: string
}

export interface ApiKeyWithRawKey extends ApiKey {
  rawKey: string
}

export interface ApiCallLog {
  id: string
  endpoint: string
  method: string
  statusCode: number
  responseTimeMs: number
  occurredAt: string
  ipAddress: string
  apiKeyId: string
}

export interface IntegrationStats {
  totalApiKeys: number
  activeApiKeys: number
  revokedApiKeys: number
  totalCalls: number
  callsLast24h: number
  avgResponseTimeMs: number
  successRate: number
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const { data } = await api.get<ApiKey[]>('/api/integrations/api-keys')
  return data
}

export async function createApiKey(payload: {
  name: string
  permissions?: string[]
}): Promise<ApiKeyWithRawKey> {
  const { data } = await api.post<ApiKeyWithRawKey>('/api/integrations/api-keys', payload)
  return data
}

export async function revokeApiKey(id: string): Promise<{ id: string; revoked: boolean }> {
  const { data } = await api.delete<{ id: string; revoked: boolean }>(
    `/api/integrations/api-keys/${id}`
  )
  return data
}

export interface ListLogsParams {
  apiKeyId?: string
  statusCode?: number
  from?: string
  to?: string
  limit?: number
}

export async function listApiCallLogs(params: ListLogsParams = {}): Promise<ApiCallLog[]> {
  const { data } = await api.get<ApiCallLog[]>('/api/integrations/logs', { params })
  return data
}

export async function getIntegrationStats(): Promise<IntegrationStats> {
  const { data } = await api.get<IntegrationStats>('/api/integrations/stats')
  return data
}
