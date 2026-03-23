'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'

interface StockMovement {
  id: string
  type: 'IN' | 'OUT' | 'TRANSFER'
  quantity: number
  value: number
  notes?: string | null
  occurredAt: string
  item: { id: string; name: string; unit: string }
  user: { id: string; fullName: string; photoUrl?: string | null }
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function MovementTypeBadge({ type }: { type: 'IN' | 'OUT' | 'TRANSFER' }) {
  const config = {
    IN: { label: 'Entrada', className: 'bg-green-100 text-green-800' },
    OUT: { label: 'Saída', className: 'bg-red-100 text-red-800' },
    TRANSFER: { label: 'Transferência', className: 'bg-blue-100 text-blue-800' },
  }
  const { label, className } = config[type]
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  )
}

const LIMIT = 20

function StockMovementsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const itemIdFilter = searchParams.get('itemId') ?? undefined
  const pageParam = parseInt(searchParams.get('page') ?? '1')
  const [page, setPage] = useState(pageParam)

  function updatePage(newPage: number) {
    setPage(newPage)
    const params = new URLSearchParams()
    params.set('page', String(newPage))
    if (itemIdFilter) params.set('itemId', itemIdFilter)
    router.replace(`/stock/movements?${params.toString()}`)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['stock-movements', { page, itemId: itemIdFilter }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: LIMIT }
      if (itemIdFilter) params.itemId = itemIdFilter
      const { data } = await api.get<{ data: StockMovement[]; total: number; page: number; limit: number }>(
        '/api/stock/movements',
        { params }
      )
      return data
    },
  })

  const movements = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/stock" className="hover:underline">Estoque</Link>
            <span>/</span>
            <span>Movimentações</span>
            {itemIdFilter && (
              <>
                <span>/</span>
                <span>Filtrado por item</span>
                <button
                  className="ml-1 text-xs text-muted-foreground underline hover:text-foreground"
                  onClick={() => {
                    setPage(1)
                    router.replace('/stock/movements')
                  }}
                >
                  limpar filtro
                </button>
              </>
            )}
          </div>
          <h1 className="text-2xl font-bold">Histórico de Movimentações</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} movimentação{total !== 1 ? 'ões' : ''} encontrada{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando movimentações...</p>
      ) : movements.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Item</th>
                <th className="text-left p-3 font-medium">Tipo</th>
                <th className="text-right p-3 font-medium">Quantidade</th>
                <th className="text-right p-3 font-medium">Valor</th>
                <th className="text-left p-3 font-medium">Usuário</th>
                <th className="text-left p-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((mov) => (
                <tr key={mov.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <Link
                      href={`/stock/items/${mov.item.id}`}
                      className="font-medium hover:underline"
                    >
                      {mov.item.name}
                    </Link>
                  </td>
                  <td className="p-3">
                    <MovementTypeBadge type={mov.type} />
                  </td>
                  <td className="p-3 text-right font-medium">
                    {mov.type === 'OUT' ? '-' : '+'}{mov.quantity} {mov.item.unit}
                  </td>
                  <td className="p-3 text-right">{formatCurrency(mov.value)}</td>
                  <td className="p-3 text-muted-foreground">{mov.user.fullName}</td>
                  <td className="p-3 text-muted-foreground text-xs">{formatDate(mov.occurredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => updatePage(page - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground self-center">
            Página {page} de {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => updatePage(page + 1)}>
            Próximo
          </Button>
        </div>
      )}
    </div>
  )
}

export default function StockMovementsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Carregando movimentações...</div>}>
      <StockMovementsContent />
    </Suspense>
  )
}
