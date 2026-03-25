'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { OrdersSummary } from '@/services/dashboard.service'

interface OrderStatusChartProps {
  ordersSummary: OrdersSummary
}

const STATUS_CONFIG = [
  { key: 'draft', label: 'Rascunho', color: '#9CA3AF' },
  { key: 'open', label: 'Em Aberto', color: '#3B82F6' },
  { key: 'inProgress', label: 'Em Andamento', color: '#F59E0B' },
  { key: 'pendingApproval', label: 'Aguardando Aprovação', color: '#8B5CF6' },
  { key: 'finished', label: 'Finalizados', color: '#10B981' },
  { key: 'cancelled', label: 'Cancelados', color: '#EF4444' },
] as const

export function OrderStatusChart({ ordersSummary }: OrderStatusChartProps) {
  const data = STATUS_CONFIG.map((s) => ({
    name: s.label,
    value: ordersSummary[s.key],
    color: s.color,
  })).filter((d) => d.value > 0)

  const total = STATUS_CONFIG.reduce((sum, s) => sum + ordersSummary[s.key], 0)

  if (total === 0) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-base font-semibold mb-3">Status das OS</h2>
        <p className="text-sm text-muted-foreground">Nenhuma OS encontrada.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Status das OS</h2>
        <span className="text-xs text-muted-foreground">{total} total</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend
            formatter={(value) => <span className="text-xs">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
