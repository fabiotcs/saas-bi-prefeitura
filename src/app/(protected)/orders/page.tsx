'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { listOrders } from '@/services/order.service'
import type { OrderStatus } from '@/services/order.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useRequireRole } from '@/hooks/useRequireRole'

const STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: 'Rascunho',
  OPEN: 'Aberta',
  IN_QUOTATION: 'Em Cotação',
  APPROVED: 'Aprovada',
  DELIVERED: 'Entregue',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  OPEN: 'bg-blue-100 text-blue-800',
  IN_QUOTATION: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  DELIVERED: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-teal-100 text-teal-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todos os status' },
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'OPEN', label: 'Aberta' },
  { value: 'IN_QUOTATION', label: 'Em Cotação' },
  { value: 'APPROVED', label: 'Aprovada' },
  { value: 'DELIVERED', label: 'Entregue' },
  { value: 'COMPLETED', label: 'Concluída' },
  { value: 'CANCELLED', label: 'Cancelada' },
]

export default function OrdersPage() {
  useRequireRole(['MAIN_MANAGER', 'SECRETARY_MANAGER', 'SECRETARY_USER'], '/dashboard')

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['orders', { search, status, page }],
    queryFn: () =>
      listOrders({
        search: search || undefined,
        status: (status as OrderStatus) || undefined,
        page,
        limit: 20,
      }),
  })

  const orders = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ordens de Serviço</h1>
        <Button asChild>
          <Link href="/orders/new">+ Nova OS</Link>
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Buscar por código ou nome..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código OS</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Secretaria</TableHead>
              <TableHead>Criador</TableHead>
              <TableHead>Data</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhuma ordem de serviço encontrada.
                </TableCell>
              </TableRow>
            ) : orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <span className="font-bold font-mono text-sm">{order.code}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{order.name}</p>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </TableCell>
                <TableCell className="text-sm">
                  {order.secretary?.name ?? '-'}
                </TableCell>
                <TableCell>
                  {order.createdBy ? (
                    <div className="flex items-center gap-2">
                      {order.createdBy.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={order.createdBy.photoUrl}
                          alt={order.createdBy.fullName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {order.createdBy.fullName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm">{order.createdBy.fullName}</span>
                    </div>
                  ) : '-'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/orders/${order.id}`}>Ver</Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/orders/${order.id}/edit`}>Editar</Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground self-center">
            Página {page} de {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Próximo
          </Button>
        </div>
      )}
    </div>
  )
}
