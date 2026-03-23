'use client'

import { useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getInvoiceById, uploadPaymentProof, type InvoiceStatus } from '@/services/financial.service'
import { Button } from '@/components/ui/button'
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

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

export default function InvoiceDetailPage() {
  useRequireRole(['MAIN_MANAGER', 'SECRETARY_MANAGER', 'AUDIT_VIEWER'], '/dashboard')

  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoiceById(id),
    enabled: !!id,
  })

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    try {
      await uploadPaymentProof(id, file)
      await queryClient.invalidateQueries({ queryKey: ['invoice', id] })
    } catch {
      alert('Erro ao enviar comprovante. Tente novamente.')
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground text-sm">Carregando fatura...</p>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="p-6 space-y-4">
        <Link href="/financial" className="text-sm text-primary hover:underline">
          ← Voltar para Financeiro
        </Link>
        <p className="text-destructive text-sm">Não foi possível carregar a fatura.</p>
      </div>
    )
  }

  const items = invoice.items ?? []
  const payments = invoice.payments ?? []
  const itemsTotal = items.reduce((sum, item) => sum + item.total, 0)

  const canUploadProof = user?.role === 'MAIN_MANAGER' || user?.role === 'SECRETARY_MANAGER'

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto print:p-4 print:space-y-4">
      {/* Top navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <Link href="/financial" className="text-sm text-primary hover:underline">
          ← Voltar para Financeiro
        </Link>
        <div className="flex gap-2 flex-wrap">
          {canUploadProof && (
            <>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                Upload Comprovante
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleUploadProof}
              />
            </>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            Gerar PDF
          </Button>
        </div>
      </div>

      {/* Header card */}
      <div className="rounded-lg border bg-card p-5 space-y-2">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Secretaria</p>
            <h1 className="text-xl font-bold mt-0.5">{invoice.secretary?.name ?? '-'}</h1>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[invoice.status]}`}>
            {STATUS_LABELS[invoice.status]}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Período: {formatDate(invoice.periodStart)} — {formatDate(invoice.periodEnd)}
        </p>
        {invoice.paymentProofUrl && (
          <a
            href={invoice.paymentProofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Ver comprovante de pagamento
          </a>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-blue-50 p-5 space-y-1">
          <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Total Faturado</p>
          <p className="text-2xl font-bold text-blue-700">{formatBRL(invoice.totalBilled)}</p>
        </div>
        <div className="rounded-xl border bg-green-50 p-5 space-y-1">
          <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Total Líquido</p>
          <p className="text-2xl font-bold text-green-700">{formatBRL(invoice.totalNet)}</p>
        </div>
        <div className="rounded-xl border bg-teal-50 p-5 space-y-1">
          <p className="text-xs text-teal-600 font-medium uppercase tracking-wide">Total Pago</p>
          <p className="text-2xl font-bold text-teal-700">{formatBRL(invoice.totalPaid)}</p>
        </div>
      </div>

      {/* Items table */}
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-base font-semibold">Itens da Fatura</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Nenhum item cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-2 font-medium">Descrição</th>
                  <th className="text-center pb-2 font-medium">Qtd.</th>
                  <th className="text-right pb-2 font-medium">Valor Unit.</th>
                  <th className="text-right pb-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2">{item.itemName}</td>
                    <td className="py-2 text-center text-muted-foreground">{item.quantity}</td>
                    <td className="py-2 text-right text-muted-foreground">{formatBRL(item.unitPrice)}</td>
                    <td className="py-2 text-right font-medium">{formatBRL(item.total)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} className="pt-3 text-right text-muted-foreground text-xs">
                    Total dos Itens
                  </td>
                  <td className="pt-3 text-right font-bold">{formatBRL(itemsTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Payment history */}
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-base font-semibold">Histórico de Pagamentos</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Nenhum pagamento registrado.</p>
        ) : (
          <div className="space-y-2">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-md border px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{formatBRL(payment.amount)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pago em {formatDate(payment.paidAt)}
                  </p>
                </div>
                {payment.proofUrl && (
                  <a
                    href={payment.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-xs hover:underline"
                  >
                    Comprovante
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
