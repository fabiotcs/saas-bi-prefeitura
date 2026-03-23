'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { api } from '@/lib/api'
import { useRequireRole } from '@/hooks/useRequireRole'

type Period = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL'

interface AbcItem {
  id: string
  name: string
  value: number
  abcClass: 'A' | 'B' | 'C'
  rank: number
}

interface TopMovedItem {
  id: string
  name: string
  quantity: number
  value: number
}

interface ZeroMovementItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  unit: string
}

interface AtypicalMovement {
  id: string
  item: string
  quantity: number
  occurredAt: string
}

interface AnalyticsData {
  period: string
  topMovedItems: TopMovedItem[]
  zeroMovementItems: ZeroMovementItem[]
  frozenStockValue: number
  atypicalMovements: AtypicalMovement[]
  abcDistribution: { A: number; B: number; C: number }
  abcItems: AbcItem[]
  recommendations: string[]
}

const ABC_COLORS = { A: '#22c55e', B: '#eab308', C: '#94a3b8' }
const PERIOD_LABELS: Record<Period, string> = {
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  ANNUAL: 'Anual',
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function AbcClassBadge({ cls }: { cls: 'A' | 'B' | 'C' }) {
  const colors: Record<string, string> = {
    A: 'bg-green-100 text-green-800',
    B: 'bg-yellow-100 text-yellow-800',
    C: 'bg-gray-100 text-gray-700',
  }
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ${colors[cls]}`}>
      {cls}
    </span>
  )
}

function StockAnalyticsContent() {
  useRequireRole(['MAIN_MANAGER', 'SECRETARY_MANAGER'], '/dashboard')

  const router = useRouter()
  const searchParams = useSearchParams()
  const period = (searchParams.get('period') as Period) ?? 'MONTHLY'

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['stock-analytics', period],
    queryFn: () => api.get(`/api/stock/analytics?period=${period}`).then(r => r.data),
  })

  function handlePeriodChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', e.target.value)
    router.push(`?${params.toString()}`)
  }

  const abcPieData = data
    ? [
        { name: 'Classe A', value: data.abcDistribution.A, color: ABC_COLORS.A },
        { name: 'Classe B', value: data.abcDistribution.B, color: ABC_COLORS.B },
        { name: 'Classe C', value: data.abcDistribution.C, color: ABC_COLORS.C },
      ]
    : []

  const barData = (data?.topMovedItems ?? []).map(item => ({
    name: item.name.length > 20 ? item.name.slice(0, 20) + '…' : item.name,
    value: item.value,
  }))

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Análise de Estoque</h1>
          <p className="text-sm text-muted-foreground mt-1">Curva ABC, giro de estoque e recomendações automáticas</p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="period-select" className="text-sm font-medium">
            Período:
          </label>
          <select
            id="period-select"
            value={period}
            onChange={handlePeriodChange}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
              <option key={p} value={p}>
                {PERIOD_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando análise...</p>
      ) : (
        <>
          {/* Section 1: ABC Distribution */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Curva ABC</h2>

            {/* ABC cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border bg-card p-5 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                  <span className="text-sm text-muted-foreground">Classe A — 80% do valor</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{data?.abcDistribution.A ?? 0} itens</p>
              </div>
              <div className="rounded-xl border bg-card p-5 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />
                  <span className="text-sm text-muted-foreground">Classe B — 15% do valor</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600">{data?.abcDistribution.B ?? 0} itens</p>
              </div>
              <div className="rounded-xl border bg-card p-5 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-400 inline-block" />
                  <span className="text-sm text-muted-foreground">Classe C — 5% do valor</span>
                </div>
                <p className="text-2xl font-bold text-slate-600">{data?.abcDistribution.C ?? 0} itens</p>
              </div>
            </div>

            {/* ABC pie chart + table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie chart */}
              <div className="rounded-xl border bg-card p-5">
                <h3 className="text-sm font-medium mb-4">Distribuição por Classe</h3>
                {abcPieData.every(d => d.value === 0) ? (
                  <p className="text-muted-foreground text-sm">Sem dados no período.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={abcPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {abcPieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* ABC items table */}
              <div className="rounded-xl border bg-card p-5 overflow-auto">
                <h3 className="text-sm font-medium mb-4">Itens por Classificação</h3>
                {(data?.abcItems ?? []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">Sem itens no período.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2 font-medium">#</th>
                        <th className="text-left p-2 font-medium">Nome</th>
                        <th className="text-right p-2 font-medium">Valor</th>
                        <th className="text-center p-2 font-medium">Classe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.abcItems ?? []).map((item) => (
                        <tr key={item.id} className="border-t hover:bg-muted/30 transition-colors">
                          <td className="p-2 text-muted-foreground">{item.rank}</td>
                          <td className="p-2 font-medium">{item.name}</td>
                          <td className="p-2 text-right">{formatCurrency(item.value)}</td>
                          <td className="p-2 text-center">
                            <AbcClassBadge cls={item.abcClass} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>

          {/* Section 2: Top 10 Mais Movimentados */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Top 10 Mais Movimentados</h2>
            <div className="rounded-xl border bg-card p-5">
              {(data?.topMovedItems ?? []).length === 0 ? (
                <p className="text-muted-foreground text-sm">Sem movimentações no período.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={barData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                    <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          {/* Section 3: Indicadores */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Indicadores</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Frozen stock value card */}
              <div className="rounded-xl border bg-card p-5 space-y-2">
                <p className="text-sm text-muted-foreground">Valor em Estoque Parado</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(data?.frozenStockValue ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Itens sem movimentação no período selecionado
                </p>
              </div>

              {/* Zero movement items */}
              <div className="rounded-xl border bg-card p-5 space-y-2">
                <p className="text-sm font-medium">Itens Sem Movimentação</p>
                {(data?.zeroMovementItems ?? []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">Todos os itens foram movimentados.</p>
                ) : (
                  <ul className="space-y-1 max-h-48 overflow-y-auto">
                    {(data?.zeroMovementItems ?? []).slice(0, 10).map((item) => (
                      <li key={item.id}>
                        <Link
                          href={`/stock/items/${item.id}`}
                          className="text-sm text-blue-600 hover:underline block truncate"
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {/* Section 4: Atypical movements */}
          {(data?.atypicalMovements ?? []).length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Movimentações Atípicas</h2>
              <div className="rounded-xl border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Item</th>
                      <th className="text-right p-3 font-medium">Quantidade</th>
                      <th className="text-left p-3 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.atypicalMovements ?? []).map((m) => (
                      <tr key={m.id} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium">{m.item}</td>
                        <td className="p-3 text-right">{m.quantity.toLocaleString('pt-BR')}</td>
                        <td className="p-3 text-muted-foreground text-xs">
                          {new Date(m.occurredAt).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Section 5: Recommendations */}
          {(data?.recommendations ?? []).length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Recomendações</h2>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
                {(data?.recommendations ?? []).map((rec, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <AlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={16} />
                    <p className="text-sm text-amber-900">{rec}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

export default function StockAnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Carregando análise...</div>}>
      <StockAnalyticsContent />
    </Suspense>
  )
}
