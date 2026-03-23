'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { BIDailyBudget } from '@/services/bi.service'

interface BIDailyBudgetsChartProps {
  data: BIDailyBudget[]
  isLoading?: boolean
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function formatCurrencyShort(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}k`
  return `R$ ${value.toFixed(0)}`
}

export function BIDailyBudgetsChart({ data, isLoading = false }: BIDailyBudgetsChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-5 h-64 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <h3 className="font-semibold text-sm">Orçamentos Aprovados por Dia</h3>
      {data.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          Nenhum dado no período selecionado.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatCurrencyShort}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value) =>
                typeof value === 'number'
                  ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  : String(value)
              }
              labelFormatter={(label) =>
                typeof label === 'string' ? formatDate(label) : String(label)
              }
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Valor"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
