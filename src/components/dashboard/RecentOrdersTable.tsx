'use client'

import Link from 'next/link'
import type { RecentOrder } from '@/services/dashboard.service'

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
  DRAFT: 'bg-gray-100 text-gray-700',
  OPEN: 'bg-blue-100 text-blue-700',
  IN_QUOTATION: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-teal-100 text-teal-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

interface RecentOrdersTableProps {
  recentOrders: RecentOrder[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function RecentOrdersTable({ recentOrders }: RecentOrdersTableProps) {
  if (recentOrders.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-base font-semibold mb-3">Últimas OS</h2>
        <p className="text-sm text-muted-foreground">Nenhuma OS encontrada.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="text-base font-semibold">Últimas OS</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Código</th>
              <th className="text-left p-3 font-medium">Nome</th>
              <th className="text-left p-3 font-medium">Secretaria</th>
              <th className="text-center p-3 font-medium">Status</th>
              <th className="text-right p-3 font-medium">Data</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((order) => (
              <tr key={order.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="p-3 font-mono text-xs font-medium">{order.code}</td>
                <td className="p-3 max-w-[160px] truncate">{order.name}</td>
                <td className="p-3 text-muted-foreground text-xs max-w-[120px] truncate">
                  {order.secretaryName}
                </td>
                <td className="p-3 text-center">
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
                      STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </td>
                <td className="p-3 text-right text-xs text-muted-foreground">
                  {formatDate(order.createdAt)}
                </td>
                <td className="p-3">
                  <Link
                    href={`/orders/${order.id}`}
                    className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
