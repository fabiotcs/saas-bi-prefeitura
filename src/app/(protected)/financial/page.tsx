'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  getFinancialSummary,
  listInvoices,
  type InvoiceStatus,
} from '@/services/financial.service'
import { listSecretaries } from '@/services/secretary.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useRequireRole } from '@/hooks/useRequireRole'
import { useAuthStore } from '@/store/auth.store'

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  PAID: 'Pago',
  OVERDUE: 'Vencida',
  PARTIALLY_PAID: 'Parcialmente Pago',
  PENDING: 'Pendente',
}

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  PAID: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800',
  PENDING: 'bg-gray-100 text-gray-700',
}

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todos os status' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'PARTIALLY_PAID', label: 'Parcialmente Pago' },
  { value: 'PAID', label: 'Pago' },
  { value: 'OVERDUE', label: 'Vencida' },
]

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

export default function FinancialPage() {
  useRequireRole(['MAIN_MANAGER', 'SECRETARY_MANAGER', 'AUDIT_VIEWER'], '/dashboard')

  const user = useAuthStore((s) => s.user)

  const [secretaryId, setSecretaryId] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  const summaryParams = {
    from: from || undefined,
    to: to || undefined,
  }

  const { data: summary } = useQuery({
    queryKey: ['financial-summary', summaryParams],
    queryFn: () => getFinancialSummary(summaryParams.from, summaryParams.to),
  })

  const { data: secretariesData } = useQuery({
    queryKey: ['secretaries-select'],
    queryFn: () => listSecretaries({ limit: 100 }),
  })

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', { secretaryId, status, from, to, page }],
    queryFn: () =>
      listInvoices({
        secretaryId: secretaryId || undefined,
        status: (status as InvoiceStatus) || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
      }),
  })

  const invoices = invoicesData?.data ?? []
  const total = invoicesData?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  const bySecretary = summary?.bySecretary ?? []
  const maxTotal = Math.max(...bySecretary.map((s) => s.total), 1)

  const handleFilterChange = () => setPage(1)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Módulo Financeiro</h1>
        {user?.role === 'MAIN_MANAGER' && (
          <Button asChild>
            <Link href="/financial/invoices/new">+ Nova Fatura</Link>
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-blue-50 p-5 space-y-1">
          <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Total Faturado</p>
          <p className="text-2xl font-bold text-blue-700">{formatBRL(summary?.totalBilled ?? 0)}</p>
        </div>
        <div className="rounded-xl border bg-green-50 p-5 space-y-1">
          <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Total Líquido</p>
          <p className="text-2xl font-bold text-green-700">{formatBRL(summary?.totalNet ?? 0)}</p>
        </div>
        <div className="rounded-xl border bg-teal-50 p-5 space-y-1">
          <p className="text-xs text-teal-600 font-medium uppercase tracking-wide">Total Pago</p>
          <p className="text-2xl font-bold text-teal-700">{formatBRL(summary?.totalPaid ?? 0)}</p>
        </div>
      </div>

      {/* Bar Chart by Secretary (CSS bars) */}
      {bySecretary.length > 0 && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="text-base font-semibold">Faturado por Secretaria</h2>
          <div className="space-y-3">
            {bySecretary.map((s) => (
              <div key={s.secretaryId} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="truncate max-w-[60%]">{s.name}</span>
                  <span className="font-medium text-muted-foreground">{formatBRL(s.total)}</span>
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${Math.round((s.total / maxTotal) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-end">
        <select
          value={secretaryId}
          onChange={(e) => { setSecretaryId(e.target.value); handleFilterChange() }}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="">Todas as secretarias</option>
          {(secretariesData?.data ?? []).map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); handleFilterChange() }}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">De</span>
          <Input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); handleFilterChange() }}
            className="w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Até</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); handleFilterChange() }}
            className="w-40"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Secretaria</TableHead>
              <TableHead>Período</TableHead>
              <TableHead className="text-right">Total Faturado</TableHead>
              <TableHead className="text-right">Total Pago</TableHead>
              <TableHead>Status</TableHead>
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
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhuma fatura encontrada.
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.secretary?.name ?? '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(invoice.periodStart)} — {formatDate(invoice.periodEnd)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatBRL(invoice.totalBilled)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatBRL(invoice.totalPaid)}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[invoice.status]}`}>
                      {STATUS_LABELS[invoice.status]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/financial/invoices/${invoice.id}`}>Ver</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
