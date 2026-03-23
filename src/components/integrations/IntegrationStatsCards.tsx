'use client'

import type { IntegrationStats } from '@/services/integrations.service'

interface IntegrationStatsCardsProps {
  stats: IntegrationStats
  isLoading: boolean
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export function IntegrationStatsCards({ stats, isLoading }: IntegrationStatsCardsProps) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando estatísticas...</p>
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      <StatCard label="API Keys Ativas" value={stats.activeApiKeys} sub={`${stats.revokedApiKeys} revogadas`} />
      <StatCard label="Total de Chamadas" value={stats.totalCalls.toLocaleString('pt-BR')} />
      <StatCard label="Chamadas (24h)" value={stats.callsLast24h.toLocaleString('pt-BR')} />
      <StatCard label="Tempo Médio" value={`${stats.avgResponseTimeMs}ms`} />
      <StatCard
        label="Taxa de Sucesso"
        value={`${stats.successRate}%`}
        sub="últimas 100 chamadas"
      />
    </div>
  )
}
