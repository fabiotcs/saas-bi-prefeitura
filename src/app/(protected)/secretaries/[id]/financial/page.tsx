'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { getSecretaryById, getFinancialSummary } from '@/services/secretary.service'
import { BudgetProgressBar } from '@/components/secretary/BudgetProgressBar'
import { Button } from '@/components/ui/button'
import { useRequireRole } from '@/hooks/useRequireRole'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function SecretaryFinancialPage({ params }: { params: { id: string } }) {
  useRequireRole(['MAIN_MANAGER', 'SECRETARY_MANAGER', 'AUDIT_VIEWER'], '/dashboard')

  const { data: secretary } = useQuery({
    queryKey: ['secretary', params.id],
    queryFn: () => getSecretaryById(params.id),
  })

  const { data: summary } = useQuery({
    queryKey: ['secretary-financial', params.id],
    queryFn: () => getFinancialSummary(params.id),
  })

  if (!secretary || !summary) return <div className="p-6 text-muted-foreground text-sm">Carregando...</div>

  const bars = [
    { label: 'Orçamento por Empenho', value: summary.budgetByCommitment, color: 'bg-blue-500' },
    { label: 'Utilizado em Pedidos', value: summary.usedInOrders, color: 'bg-orange-500' },
    { label: 'Distribuído para Subs', value: summary.distributedToSub, color: 'bg-purple-500' },
  ]
  const maxVal = Math.max(...bars.map(b => b.value), 1)

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/secretaries">← Voltar</Link>
        </Button>
        <h1 className="text-2xl font-bold">Resumo Financeiro — {secretary.name}</h1>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Orçamento Geral</h2>
        <BudgetProgressBar allocated={secretary.budgetAllocated} used={secretary.budgetUsed} />
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-5">
        <h2 className="font-semibold">Distribuição de Valores</h2>
        {bars.map(bar => (
          <div key={bar.label} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{bar.label}</span>
              <span className="font-medium">{formatBRL(bar.value)}</span>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${bar.color}`}
                style={{ width: `${Math.round((bar.value / maxVal) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
