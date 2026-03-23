'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { MovimentarEstoqueModal } from '@/components/stock/MovimentarEstoqueModal'

interface StorageLocation {
  id: string
  name: string
}

interface StockMovement {
  id: string
  type: 'IN' | 'OUT' | 'TRANSFER'
  quantity: number
  value: number
  notes?: string | null
  occurredAt: string
  user: { id: string; fullName: string; photoUrl?: string | null }
}

interface StockItemDetail {
  id: string
  name: string
  barcode?: string | null
  unit: string
  unitPrice: number
  quantity: number
  minimumAlert: number
  abcClass?: 'A' | 'B' | 'C' | null
  storageLocationId?: string | null
  storageLocation?: StorageLocation | null
  movements: StockMovement[]
  createdAt: string
  updatedAt: string
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

function AbcBadge({ abcClass }: { abcClass?: 'A' | 'B' | 'C' | null }) {
  if (!abcClass) return null
  const colors: Record<string, string> = {
    A: 'bg-green-100 text-green-800',
    B: 'bg-yellow-100 text-yellow-800',
    C: 'bg-gray-100 text-gray-700',
  }
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${colors[abcClass]}`}>
      Classe {abcClass}
    </span>
  )
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

export default function StockItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const { data: item, isLoading, isError } = useQuery({
    queryKey: ['stock-item', id],
    queryFn: async () => {
      const { data } = await api.get<StockItemDetail>(`/api/stock/items/${id}`)
      return data
    },
    enabled: !!id,
  })

  // Render QR code on canvas
  useEffect(() => {
    if (!item || !canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, item.id, {
      width: 140,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    }).catch(() => {/* ignore errors */})
  }, [item])

  // Render barcode on SVG
  useEffect(() => {
    if (!item || !svgRef.current) return
    const barcodeValue = item.barcode || item.id
    try {
      JsBarcode(svgRef.current, barcodeValue, {
        format: 'CODE128',
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 12,
        margin: 4,
      })
    } catch {
      // barcode render failed — ignore
    }
  }, [item])

  if (isLoading) {
    return <div className="p-6 text-muted-foreground text-sm">Carregando item...</div>
  }

  if (isError || !item) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-destructive text-sm">Item não encontrado.</p>
        <Button variant="outline" onClick={() => router.push('/stock')}>Voltar ao Estoque</Button>
      </div>
    )
  }

  const isAlert = item.quantity <= item.minimumAlert

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/stock" className="hover:underline">Estoque</Link>
            <span>/</span>
            <span>{item.name}</span>
          </div>
          <h1 className="text-2xl font-bold">{item.name}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <AbcBadge abcClass={item.abcClass} />
            {isAlert && (
              <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700">
                ALERTA MÍNIMO
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" asChild>
            <Link href={`/stock/items/${id}/edit`}>Editar</Link>
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            Movimentar Estoque
          </Button>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Quantidade em Estoque</p>
          <p className="text-2xl font-bold">{item.quantity} <span className="text-sm font-normal text-muted-foreground">{item.unit}</span></p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Preço Unitário</p>
          <p className="text-2xl font-bold">{formatCurrency(item.unitPrice)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Alerta Mínimo</p>
          <p className="text-2xl font-bold">{item.minimumAlert} <span className="text-sm font-normal text-muted-foreground">{item.unit}</span></p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Unidade de Medida</p>
          <p className="text-lg font-semibold">{item.unit}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Local de Armazenamento</p>
          <p className="text-lg font-semibold">{item.storageLocation?.name ?? '—'}</p>
        </div>
        {item.barcode && (
          <div className="rounded-xl border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Código de Barras</p>
            <p className="text-lg font-semibold font-mono">{item.barcode}</p>
          </div>
        )}
      </div>

      {/* QR code + Barcode */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <p className="text-sm font-medium">QR Code</p>
          <div className="flex justify-center">
            <canvas ref={canvasRef} className="rounded" />
          </div>
          <p className="text-xs text-center text-muted-foreground font-mono">{item.id}</p>
        </div>
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <p className="text-sm font-medium">Código de Barras</p>
          <div className="flex justify-center overflow-hidden">
            <svg ref={svgRef} className="max-w-full" />
          </div>
        </div>
      </div>

      {/* Recent movements */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Histórico de Movimentações</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/stock/movements?itemId=${id}`}>Ver todos</Link>
          </Button>
        </div>
        {item.movements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Tipo</th>
                  <th className="text-right p-3 font-medium">Quantidade</th>
                  <th className="text-right p-3 font-medium">Valor</th>
                  <th className="text-left p-3 font-medium">Usuário</th>
                  <th className="text-left p-3 font-medium">Data</th>
                  <th className="text-left p-3 font-medium">Obs.</th>
                </tr>
              </thead>
              <tbody>
                {item.movements.map((mov) => (
                  <tr key={mov.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <MovementTypeBadge type={mov.type} />
                    </td>
                    <td className="p-3 text-right font-medium">
                      {mov.type === 'OUT' ? '-' : '+'}{mov.quantity} {item.unit}
                    </td>
                    <td className="p-3 text-right">{formatCurrency(mov.value)}</td>
                    <td className="p-3 text-muted-foreground">{mov.user.fullName}</td>
                    <td className="p-3 text-muted-foreground text-xs">{formatDate(mov.occurredAt)}</td>
                    <td className="p-3 text-muted-foreground text-xs">{mov.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MovimentarEstoqueModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        itemId={id}
        itemName={item.name}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['stock-item', id] })
        }}
      />
    </div>
  )
}
