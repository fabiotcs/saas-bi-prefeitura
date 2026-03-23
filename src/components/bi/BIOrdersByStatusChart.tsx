'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { BIOrderStatus } from '@/services/bi.service'

interface BIOrdersByStatusChartProps {
  data: BIOrderStatus[]
  isLoading?: boolean
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  OPEN: 'Aberto',
  IN_QUOTATION: 'Em Cotação',
  APPROVED: 'Aprovado',
  DELIVERED: 'Entregue',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#94a3b8',
  OPEN: '#60a5fa',
  IN_QUOTATION: '#f59e0b',
  APPROVED: '#34d399',
  DELIVERED: '#6366f1',
  COMPLETED: '#22c55e',
  CANCELLED: '#ef4444',
}

export function BIOrdersByStatusChart({ data, isLoading = false }: BIOrdersByStatusChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-5 h-64 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    )
  }

  const chartData = data.map((d) => ({
    status: STATUS_LABELS[d.status] ?? d.status,
    rawStatus: d.status,
    count: d.count,
  }))

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <h3 className="font-semibold text-sm">Pedidos por Status</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="status"
            tick={{ fontSize: 10 }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip />
          <Bar
            dataKey="count"
            name="Qtd"
            radius={[4, 4, 0, 0]}
            fill="#3b82f6"
            // Each bar can have its own color via Cell, but for simplicity use a single color
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export { STATUS_COLORS }
