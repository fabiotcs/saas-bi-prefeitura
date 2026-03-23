'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { BIConsumptionBySecretary } from '@/services/bi.service'

interface BIConsumptionBySecretaryChartProps {
  data: BIConsumptionBySecretary[]
  isLoading?: boolean
}

const COLORS = [
  '#3b82f6',
  '#f59e0b',
  '#22c55e',
  '#ef4444',
  '#6366f1',
  '#ec4899',
  '#14b8a6',
  '#f97316',
]

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function BIConsumptionBySecretaryChart({
  data,
  isLoading = false,
}: BIConsumptionBySecretaryChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-5 h-64 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <h3 className="font-semibold text-sm">Consumo por Secretaria</h3>
      {data.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          Nenhum dado no período selecionado.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="secretary"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={false}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) =>
                typeof value === 'number' ? formatCurrency(value) : String(value)
              }
            />
            <Legend
              formatter={(value) => (
                <span className="text-xs">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
