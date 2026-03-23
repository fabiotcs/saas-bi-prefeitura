'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useRequireRole } from '@/hooks/useRequireRole'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { TwoFactorModal } from '@/components/auth/TwoFactorModal'
import { OrderTimeline } from '@/components/orders/OrderTimeline'

// ---- Types ----

type OrderStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'IN_QUOTATION'
  | 'APPROVED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'

type OrderCategory = 'MATERIAL' | 'SERVICE' | 'EQUIPMENT'

interface OrderItem {
  id: string
  name: string
  imageUrl?: string | null
  unit: string
  quantity: number
  referenceValue: number
}

interface TimelineEvent {
  id: string
  step: string
  occurredAt: string
  user: { id: string; fullName: string; photoUrl?: string | null }
}

interface Invoice {
  id: string
  fileUrl: string
  establishmentName: string
  issuedAt: string
}

interface DeliveryRecord {
  id: string
  observations?: string | null
  deliveredAt?: string | null
  receivedAt: string
}

interface NonConformity {
  id: string
  observations: string
  registeredAt: string
}

interface DeliveryLocation {
  id: string
  name: string
  zipCode: string
  address: string
  city: string
  state: string
}

interface OrderDetail {
  id: string
  code: string
  name: string
  category: OrderCategory
  status: OrderStatus
  investmentArea: string
  receiverName: string
  observations?: string | null
  quotationStartDate?: string | null
  quotationEndDate?: string | null
  desiredDeliveryDate?: string | null
  regionRadius?: number | null
  specificMunicipality?: string | null
  createdAt: string
  updatedAt: string
  secretary?: { id: string; name: string }
  subSecretary?: { id: string; name: string } | null
  createdBy?: { id: string; fullName: string; photoUrl?: string | null }
  items: OrderItem[]
  timeline: TimelineEvent[]
  invoices: Invoice[]
  deliveryRecords: DeliveryRecord[]
  nonConformities: NonConformity[]
  deliveryLocations: DeliveryLocation[]
}

// ---- Constants ----

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

const CATEGORY_LABELS: Record<OrderCategory, string> = {
  MATERIAL: 'Material',
  SERVICE: 'Serviço',
  EQUIPMENT: 'Equipamento',
}

// ---- Helpers ----

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ---- Component ----

export default function OrderDetailPage() {
  useRequireRole(['MAIN_MANAGER', 'SECRETARY_MANAGER', 'SECRETARY_USER'], '/dashboard')

  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)

  const [showApproveModal, setShowApproveModal] = useState(false)
  const [approving, setApproving] = useState(false)
  const [approveError, setApproveError] = useState<string | null>(null)
  const [printLoading, setPrintLoading] = useState(false)

  const { data: order, isLoading, error, refetch } = useQuery<OrderDetail>({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data } = await api.get<OrderDetail>(`/api/orders/${id}`)
      return data
    },
    enabled: !!id,
  })

  const canApprove =
    (user?.role === 'MAIN_MANAGER' || user?.role === 'SECRETARY_MANAGER') &&
    order &&
    (order.status === 'OPEN' || order.status === 'IN_QUOTATION')

  const handleApproveSuccess = async (otpToken: string, code: string) => {
    setShowApproveModal(false)
    setApproving(true)
    setApproveError(null)
    try {
      await api.post(`/api/orders/${id}/approve`, {
        otpCode: code,
        twoFactorRequestId: otpToken,
      })
      await refetch()
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Erro ao aprovar ordem de serviço. Tente novamente.'
      setApproveError(message)
    } finally {
      setApproving(false)
    }
  }

  const handlePrint = async () => {
    if (!order) return
    setPrintLoading(true)
    try {
      const { data } = await api.post<string>(
        `/api/orders/${id}/print`,
        {},
        { responseType: 'text' }
      )
      const blob = new Blob([data as unknown as string], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const win = window.open(url, '_blank')
      if (win) win.focus()
    } catch {
      alert('Erro ao gerar relatório. Tente novamente.')
    } finally {
      setPrintLoading(false)
    }
  }

  // ---- Loading / Error states ----

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground text-sm">Carregando ordem de serviço...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="p-6 space-y-4">
        <Link href="/orders" className="text-sm text-primary hover:underline">
          ← Voltar para OS
        </Link>
        <p className="text-destructive text-sm">
          Não foi possível carregar a ordem de serviço.
        </p>
      </div>
    )
  }

  const totalValue = order.items.reduce(
    (sum, item) => sum + item.quantity * item.referenceValue,
    0
  )

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Top navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href="/orders" className="text-sm text-primary hover:underline">
          ← Voltar para OS
        </Link>
        <div className="flex gap-2 flex-wrap">
          {canApprove && (
            <Button
              onClick={() => setShowApproveModal(true)}
              disabled={approving}
              variant="default"
            >
              {approving ? 'Aprovando...' : 'Aprovar OS'}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={printLoading}
          >
            {printLoading ? 'Gerando...' : 'Gerar PDF'}
          </Button>
        </div>
      </div>

      {approveError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {approveError}
        </div>
      )}

      {/* Header card */}
      <div className="rounded-lg border bg-card p-5 space-y-1">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-muted-foreground font-mono">{order.code}</p>
            <h1 className="text-xl font-bold mt-0.5">{order.name}</h1>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status]}`}
          >
            {STATUS_LABELS[order.status]}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {CATEGORY_LABELS[order.category]} · {order.secretary?.name ?? '-'}
          {order.subSecretary ? ` / ${order.subSecretary.name}` : ''}
        </p>
      </div>

      {/* Dados Gerais */}
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-base font-semibold">Dados Gerais</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
              Área de Investimento
            </dt>
            <dd className="text-sm">{order.investmentArea}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
              Responsável pelo Recebimento
            </dt>
            <dd className="text-sm">{order.receiverName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
              Criado por
            </dt>
            <dd className="text-sm flex items-center gap-2">
              {order.createdBy?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={order.createdBy.photoUrl}
                  alt={order.createdBy.fullName}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                  {order.createdBy?.fullName.charAt(0).toUpperCase() ?? '?'}
                </div>
              )}
              {order.createdBy?.fullName ?? '-'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
              Data de Criação
            </dt>
            <dd className="text-sm">{formatDate(order.createdAt)}</dd>
          </div>
          {order.desiredDeliveryDate && (
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                Entrega Desejada
              </dt>
              <dd className="text-sm">{formatDate(order.desiredDeliveryDate)}</dd>
            </div>
          )}
          {order.quotationStartDate && (
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                Início da Cotação
              </dt>
              <dd className="text-sm">{formatDate(order.quotationStartDate)}</dd>
            </div>
          )}
          {order.quotationEndDate && (
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                Fim da Cotação
              </dt>
              <dd className="text-sm">{formatDate(order.quotationEndDate)}</dd>
            </div>
          )}
          {order.specificMunicipality && (
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                Município Específico
              </dt>
              <dd className="text-sm">{order.specificMunicipality}</dd>
            </div>
          )}
          {order.regionRadius != null && (
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                Raio da Região (km)
              </dt>
              <dd className="text-sm">{order.regionRadius} km</dd>
            </div>
          )}
          {order.observations && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                Observações
              </dt>
              <dd className="text-sm">{order.observations}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Itens */}
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-base font-semibold">Itens</h2>
        {order.items.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Nenhum item cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-2 font-medium">Item</th>
                  <th className="text-center pb-2 font-medium">Unidade</th>
                  <th className="text-center pb-2 font-medium">Quantidade</th>
                  <th className="text-right pb-2 font-medium">Valor Ref. (unit.)</th>
                  <th className="text-right pb-2 font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2">{item.name}</td>
                    <td className="py-2 text-center text-muted-foreground">{item.unit}</td>
                    <td className="py-2 text-center">{item.quantity}</td>
                    <td className="py-2 text-right text-muted-foreground">
                      {formatCurrency(item.referenceValue)}
                    </td>
                    <td className="py-2 text-right font-medium">
                      {formatCurrency(item.quantity * item.referenceValue)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4} className="pt-3 text-right text-muted-foreground text-xs">
                    Total de Referência
                  </td>
                  <td className="pt-3 text-right font-bold">
                    {formatCurrency(totalValue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Timeline */}
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-base font-semibold">Linha do Tempo</h2>
        <OrderTimeline events={order.timeline} />
      </section>

      {/* Notas Fiscais */}
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-base font-semibold">Notas Fiscais</h2>
        {order.invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Nenhuma nota fiscal registrada.</p>
        ) : (
          <div className="space-y-2">
            {order.invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-md border px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{inv.establishmentName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Emitida em {formatDate(inv.issuedAt)}
                  </p>
                </div>
                <a
                  href={inv.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-xs hover:underline"
                >
                  Visualizar
                </a>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Entregas */}
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-base font-semibold">Entregas</h2>
        {order.deliveryRecords.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Nenhuma entrega registrada.</p>
        ) : (
          <div className="space-y-2">
            {order.deliveryRecords.map((rec) => (
              <div
                key={rec.id}
                className="rounded-md border px-4 py-3 text-sm space-y-1"
              >
                <p className="text-xs text-muted-foreground">
                  Recebido em {formatDate(rec.receivedAt)}
                  {rec.deliveredAt ? ` · Entregue em ${formatDate(rec.deliveredAt)}` : ''}
                </p>
                {rec.observations && (
                  <p className="text-sm">{rec.observations}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Não Conformidades */}
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-base font-semibold">Não Conformidades</h2>
        {order.nonConformities.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Nenhuma não conformidade registrada.</p>
        ) : (
          <div className="space-y-2">
            {order.nonConformities.map((nc) => (
              <div
                key={nc.id}
                className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm space-y-1"
              >
                <p className="text-xs text-muted-foreground">
                  Registrado em {formatDate(nc.registeredAt)}
                </p>
                <p>{nc.observations}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2FA Modal for approval */}
      <TwoFactorModal
        isOpen={showApproveModal}
        action="APPROVE_ORDER"
        onSuccess={handleApproveSuccess}
        onCancel={() => setShowApproveModal(false)}
      />
    </div>
  )
}
