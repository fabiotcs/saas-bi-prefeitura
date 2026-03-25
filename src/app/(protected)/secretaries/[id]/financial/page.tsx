'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { getSecretaryById, getFinancialSummary } from '@/services/secretary.service'
import { Button } from '@/components/ui/button'
import { useRequireRole } from '@/hooks/useRequireRole'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function FinancialRow({
  label,
  value,
  sub,
  color = 'text-foreground',
  highlight = false,
}: {
  label: string
  value: number
  sub?: string
  color?: string
  highlight?: boolean
}) {
  return (
    <div className={`flex items-center justify-between py-3 border-b last:border-0 ${highlight ? 'font-semibold' : ''}`}>
      <div>
        <p className="text-sm">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <span className={`text-sm font-semibold tabular-nums ${color}`}>{formatBRL(value)}</span>
    </div>
  )
}

function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(Math.round((value / total) * 100), 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{pct}%</span>
        <span>{formatBRL(value)} de {formatBRL(total)}</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
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

  if (!secretary || !summary) {
    return <div className="p-6 text-muted-foreground text-sm">Carregando...</div>
  }

  const s = summary as unknown as {
    budgetAllocated: number
    budgetByCommitment: number
    commitmentUsedValue: number
    commitmentCount: number
    usedInOrders: number
    distributedToSub: number
    subCount: number
    subUsed: number
    available: number
    percentCommitted: number
    percentUsed: number
    subSecretaries: { id: string; name: string; budgetAllocated: number; budgetUsed: number }[]
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/secretaries">← Voltar</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{secretary.name}</h1>
          <p className="text-sm text-muted-foreground">Resumo Financeiro</p>
        </div>
      </div>

      {/* Card principal — Orçamento Total */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Orçamento Total Alocado</h2>
          <span className="text-xl font-bold tabular-nums">{formatBRL(s.budgetAllocated)}</span>
        </div>
        <ProgressBar value={s.budgetByCommitment} total={s.budgetAllocated} color="bg-blue-500" />
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
            Empenhado: <strong className="text-foreground">{s.percentCommitted}%</strong>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-gray-300 inline-block" />
            Disponível: <strong className="text-green-600">{formatBRL(s.available)}</strong>
          </span>
        </div>
      </div>

      {/* Detalhamento em 3 blocos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Empenho */}
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Empenho</p>
          </div>
          <p className="text-xl font-bold tabular-nums text-blue-600">{formatBRL(s.budgetByCommitment)}</p>
          <p className="text-xs text-muted-foreground">{s.commitmentCount} empenho{s.commitmentCount !== 1 ? 's' : ''} ativo{s.commitmentCount !== 1 ? 's' : ''}</p>
          {s.commitmentUsedValue > 0 && (
            <p className="text-xs text-muted-foreground">Utilizado do empenho: {formatBRL(s.commitmentUsedValue)}</p>
          )}
        </div>

        {/* Pedidos */}
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pedidos</p>
          </div>
          <p className="text-xl font-bold tabular-nums text-orange-600">{formatBRL(s.usedInOrders)}</p>
          <p className="text-xs text-muted-foreground">Faturas pagas</p>
        </div>

        {/* Subsecretárias */}
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subsecretárias</p>
          </div>
          <p className="text-xl font-bold tabular-nums text-purple-600">{formatBRL(s.distributedToSub)}</p>
          <p className="text-xs text-muted-foreground">{s.subCount} subsecretária{s.subCount !== 1 ? 's' : ''}</p>
          {s.subUsed > 0 && (
            <p className="text-xs text-muted-foreground">Utilizado pelas subs: {formatBRL(s.subUsed)}</p>
          )}
        </div>
      </div>

      {/* Tabela consolidada */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold mb-2">Consolidado em R$</h2>
        <div className="divide-y">
          <FinancialRow
            label="Orçamento Total Alocado"
            value={s.budgetAllocated}
            color="text-foreground"
            highlight
          />
          <FinancialRow
            label="Valor destinado por Empenho"
            sub={`${s.commitmentCount} empenho${s.commitmentCount !== 1 ? 's' : ''} ativo${s.commitmentCount !== 1 ? 's' : ''}`}
            value={s.budgetByCommitment}
            color="text-blue-600"
          />
          <FinancialRow
            label="Valor utilizado em Pedidos"
            sub="Faturas com status Pago"
            value={s.usedInOrders}
            color="text-orange-600"
          />
          <FinancialRow
            label="Valor distribuído para Subsecretárias"
            sub={`${s.subCount} subsecretária${s.subCount !== 1 ? 's' : ''} vinculada${s.subCount !== 1 ? 's' : ''}`}
            value={s.distributedToSub}
            color="text-purple-600"
          />
          <FinancialRow
            label="Saldo Disponível"
            value={s.available}
            color={s.available > 0 ? 'text-green-600' : 'text-red-600'}
            highlight
          />
        </div>
      </div>

      {/* Detalhe das subsecretárias */}
      {s.subSecretaries.length > 0 && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="font-semibold">Execução por Subsecretária</h2>
          {s.subSecretaries.map((sub) => {
            const pct = sub.budgetAllocated > 0 ? Math.round((sub.budgetUsed / sub.budgetAllocated) * 100) : 0
            const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500'
            return (
              <div key={sub.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{sub.name}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {formatBRL(sub.budgetUsed)} / {formatBRL(sub.budgetAllocated)}
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
