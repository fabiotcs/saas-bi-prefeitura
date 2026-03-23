'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import { useRequireRole } from '@/hooks/useRequireRole'
import { getStockDashboard, listInventory } from '@/services/inventory.service'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'

const STOCK_VIEW_KEY = 'stockView'

type ViewMode = 'GALERIA' | 'LISTA'

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

function AbcBadge({ abcClass }: { abcClass?: 'A' | 'B' | 'C' | null }) {
  if (!abcClass) return null
  const colors: Record<string, string> = {
    A: 'bg-green-100 text-green-800',
    B: 'bg-yellow-100 text-yellow-800',
    C: 'bg-gray-100 text-gray-700',
  }
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ${colors[abcClass]}`}>
      {abcClass}
    </span>
  )
}

function AlertBadge({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold bg-red-100 text-red-700">
      ALERTA
    </span>
  )
}

export default function StockPage() {
  useRequireRole(['MAIN_MANAGER', 'SECRETARY_MANAGER', 'SECRETARY_USER'], '/dashboard')

  const [viewMode, setViewMode] = useState<ViewMode>('GALERIA')
  const [search, setSearch] = useState('')
  const [barcode, setBarcode] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Persist view mode in localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STOCK_VIEW_KEY) as ViewMode | null
    if (stored === 'GALERIA' || stored === 'LISTA') {
      setViewMode(stored)
    }
  }, [])

  function handleViewMode(mode: ViewMode) {
    setViewMode(mode)
    localStorage.setItem(STOCK_VIEW_KEY, mode)
  }

  // Debounce search input 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['stock-dashboard'],
    queryFn: getStockDashboard,
  })

  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['stock-inventory', { search: debouncedSearch, barcode, page }],
    queryFn: () => listInventory({ search: debouncedSearch, barcode: barcode || undefined, page, limit: 20 }),
  })

  const items = inventoryData?.data ?? []
  const total = inventoryData?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const emailMutation = useMutation({
    mutationFn: () => api.post('/stock/email-report'),
    onSuccess: () => {
      setEmailStatus('success')
      setTimeout(() => setEmailStatus('idle'), 4000)
    },
    onError: () => {
      setEmailStatus('error')
      setTimeout(() => setEmailStatus('idle'), 4000)
    },
  })


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Estoque</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => emailMutation.mutate()}
            disabled={emailMutation.isPending}
          >
            {emailMutation.isPending ? 'Enviando...' : emailStatus === 'success' ? '✓ E-mail enviado!' : emailStatus === 'error' ? '✗ Falha ao enviar' : '📧 Resumo por E-mail'}
          </Button>
          <Button asChild>
            <Link href="/stock/items/new">+ Novo Item</Link>
          </Button>
        </div>
      </div>

      {/* Dashboard cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Produtos */}
        <div className="rounded-xl border bg-card p-5 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span>📦</span>
            <span>Total de Produtos</span>
          </div>
          <p className="text-2xl font-bold">
            {dashboardLoading ? '—' : (dashboard?.totalProducts ?? 0)}
          </p>
        </div>

        {/* Total de Itens */}
        <div className="rounded-xl border bg-card p-5 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span>🏪</span>
            <span>Total de Itens</span>
          </div>
          <p className="text-2xl font-bold">
            {dashboardLoading ? '—' : formatNumber(dashboard?.totalItems ?? 0)}
          </p>
        </div>

        {/* Valor Total */}
        <div className="rounded-xl border bg-card p-5 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span>💰</span>
            <span>Valor Total</span>
          </div>
          <p className="text-2xl font-bold">
            {dashboardLoading ? '—' : formatCurrency(dashboard?.totalValue ?? 0)}
          </p>
        </div>

        {/* Alertas de Estoque */}
        <div className="rounded-xl border bg-card p-5 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span>⚠️</span>
            <span>Alertas de Estoque</span>
          </div>
          <p className="text-2xl font-bold flex items-center gap-2">
            {dashboardLoading ? '—' : (
              <>
                {dashboard?.lowStockItems ?? 0}
                {(dashboard?.lowStockItems ?? 0) > 0 && (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700">
                    Crítico
                  </span>
                )}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Input
          placeholder="Código de barras..."
          value={barcode}
          onChange={(e) => { setBarcode(e.target.value); setPage(1) }}
          className="max-w-xs"
        />
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={viewMode === 'GALERIA' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleViewMode('GALERIA')}
          >
            Galeria
          </Button>
          <Button
            variant={viewMode === 'LISTA' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleViewMode('LISTA')}
          >
            Lista
          </Button>
        </div>
      </div>

      {/* Content */}
      {inventoryLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum item encontrado.</p>
      ) : viewMode === 'GALERIA' ? (
        /* Gallery view */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const isAlert = item.quantity <= item.minimumAlert
            return (
              <div key={item.id} className="rounded-xl border bg-card p-4 space-y-3">
                {/* Image */}
                <div className="w-full h-32 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">📦</span>
                  )}
                </div>

                {/* Info */}
                <div>
                  <p className="font-semibold text-sm line-clamp-2">{item.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatNumber(item.quantity)} {item.unit}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(item.unitPrice)} / {item.unit}
                  </p>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1 items-center">
                  <AbcBadge abcClass={item.abcClass} />
                  <AlertBadge show={isAlert} />
                </div>

                {/* Action */}
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link href={`/stock/items/${item.id}`}>Ver Item</Link>
                </Button>
              </div>
            )
          })}
        </div>
      ) : (
        /* List view */
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Nome</th>
                <th className="text-right p-3 font-medium">Quantidade</th>
                <th className="text-left p-3 font-medium">Unidade</th>
                <th className="text-right p-3 font-medium">Valor Unit.</th>
                <th className="text-left p-3 font-medium">Local</th>
                <th className="text-center p-3 font-medium">ABC</th>
                <th className="text-center p-3 font-medium">Alerta</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isAlert = item.quantity <= item.minimumAlert
                return (
                  <tr key={item.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{item.name}</td>
                    <td className="p-3 text-right">{formatNumber(item.quantity)}</td>
                    <td className="p-3">{item.unit}</td>
                    <td className="p-3 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {item.storageLocation?.name ?? '—'}
                    </td>
                    <td className="p-3 text-center">
                      <AbcBadge abcClass={item.abcClass} />
                    </td>
                    <td className="p-3 text-center">
                      <AlertBadge show={isAlert} />
                    </td>
                    <td className="p-3">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/stock/items/${item.id}`}>Ver</Link>
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground self-center">
            Página {page} de {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Próximo
          </Button>
        </div>
      )}
    </div>
  )
}
