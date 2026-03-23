'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRequireRole } from '@/hooks/useRequireRole'
import {
  listApiKeys,
  listApiCallLogs,
  getIntegrationStats,
} from '@/services/integrations.service'
import { IntegrationStatsCards } from '@/components/integrations/IntegrationStatsCards'
import { ApiKeysList } from '@/components/integrations/ApiKeysList'
import { ApiKeyCreateModal } from '@/components/integrations/ApiKeyCreateModal'
import { ApiCallLogsTable } from '@/components/integrations/ApiCallLogsTable'
import { Button } from '@/components/ui/button'

export default function IntegrationsPage() {
  useRequireRole(['MAIN_MANAGER'], '/dashboard')

  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['integration-stats'],
    queryFn: getIntegrationStats,
  })

  const { data: apiKeys, isLoading: keysLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: listApiKeys,
  })

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['api-call-logs'],
    queryFn: () => listApiCallLogs({ limit: 50 }),
  })

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Integrações e APIs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie API Keys e monitore chamadas de sistemas externos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open('/api/docs', '_blank')}>
            Ver Documentação
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>+ Nova API Key</Button>
        </div>
      </div>

      {/* Stats */}
      {stats && <IntegrationStatsCards stats={stats} isLoading={statsLoading} />}
      {statsLoading && <p className="text-sm text-muted-foreground">Carregando estatísticas...</p>}

      {/* Create modal */}
      {showCreateModal && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="text-base font-semibold">Nova API Key</h2>
          <ApiKeyCreateModal
            onCreated={() => {
              void queryClient.invalidateQueries({ queryKey: ['api-keys'] })
            }}
            onClose={() => setShowCreateModal(false)}
          />
        </div>
      )}

      {/* API Keys List */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">API Keys</h2>
        <ApiKeysList apiKeys={apiKeys ?? []} isLoading={keysLoading} />
      </div>

      {/* Call Logs */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Log de Chamadas (últimas 50)</h2>
        <ApiCallLogsTable logs={logs ?? []} isLoading={logsLoading} />
      </div>
    </div>
  )
}
