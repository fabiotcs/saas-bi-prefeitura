'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRequireRole } from '@/hooks/useRequireRole'
import { NovoLocalModal } from '@/components/stock/NovoLocalModal'

interface StorageLocation {
  id: string
  name: string
}

interface StockItemDetail {
  id: string
  name: string
  unit: string
  unitPrice: number
  minimumAlert: number
  barcode?: string | null
  storageLocationId?: string | null
  quantity: number
}

interface StockItemFormValues {
  name: string
  unit: string
  unitPrice: number
  minimumAlert: number
  barcode: string
  storageLocationId: string
}

export default function EditStockItemPage() {
  useRequireRole(['MAIN_MANAGER', 'SECRETARY_MANAGER'], '/stock')

  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [showLocalModal, setShowLocalModal] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<StockItemFormValues>()

  const { data: item, isLoading, isError } = useQuery({
    queryKey: ['stock-item', id],
    queryFn: async () => {
      const { data } = await api.get<StockItemDetail>(`/api/stock/items/${id}`)
      return data
    },
    enabled: !!id,
  })

  const { data: locationsData } = useQuery({
    queryKey: ['stock-locations'],
    queryFn: async () => {
      const { data } = await api.get<{ data: StorageLocation[] }>('/api/stock/locations')
      return data
    },
  })

  const locations = locationsData?.data ?? []

  // Pre-fill form when item loads
  useEffect(() => {
    if (item) {
      reset({
        name: item.name,
        unit: item.unit,
        unitPrice: item.unitPrice,
        minimumAlert: item.minimumAlert,
        barcode: item.barcode ?? '',
        storageLocationId: item.storageLocationId ?? '',
      })
    }
  }, [item, reset])

  async function onSubmit(values: StockItemFormValues) {
    setSubmitting(true)
    setApiError(null)
    try {
      await api.patch(`/api/stock/items/${id}`, {
        name: values.name,
        unit: values.unit,
        unitPrice: Number(values.unitPrice),
        minimumAlert: Number(values.minimumAlert),
        barcode: values.barcode || null,
        storageLocationId: values.storageLocationId || null,
      })
      router.push(`/stock/items/${id}`)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setApiError(axiosErr.response?.data?.error ?? 'Erro ao atualizar item. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

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

  return (
    <div className="p-6 max-w-xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link href="/stock" className="hover:underline">Estoque</Link>
          <span>/</span>
          <Link href={`/stock/items/${id}`} className="hover:underline">{item.name}</Link>
          <span>/</span>
          <span>Editar</span>
        </div>
        <h1 className="text-2xl font-bold">Editar Item</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome <span className="text-destructive">*</span></Label>
          <Input
            id="name"
            {...register('name', { required: 'Nome é obrigatório' })}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        {/* Unit */}
        <div className="space-y-1.5">
          <Label htmlFor="unit">Unidade de Medida <span className="text-destructive">*</span></Label>
          <Input
            id="unit"
            {...register('unit', { required: 'Unidade é obrigatória' })}
          />
          {errors.unit && <p className="text-xs text-destructive">{errors.unit.message}</p>}
        </div>

        {/* Unit Price */}
        <div className="space-y-1.5">
          <Label htmlFor="unitPrice">Preço Unitário (R$) <span className="text-destructive">*</span></Label>
          <Input
            id="unitPrice"
            type="number"
            min={0}
            step={0.01}
            {...register('unitPrice', {
              required: 'Preço unitário é obrigatório',
              min: { value: 0, message: 'Preço não pode ser negativo' },
              valueAsNumber: true,
            })}
          />
          {errors.unitPrice && <p className="text-xs text-destructive">{errors.unitPrice.message}</p>}
        </div>

        {/* Minimum Alert */}
        <div className="space-y-1.5">
          <Label htmlFor="minimumAlert">Alerta Mínimo de Estoque</Label>
          <Input
            id="minimumAlert"
            type="number"
            min={0}
            step={1}
            {...register('minimumAlert', {
              min: { value: 0, message: 'Valor não pode ser negativo' },
              valueAsNumber: true,
            })}
          />
          {errors.minimumAlert && <p className="text-xs text-destructive">{errors.minimumAlert.message}</p>}
        </div>

        {/* Barcode */}
        <div className="space-y-1.5">
          <Label htmlFor="barcode">Código de Barras (opcional)</Label>
          <Input
            id="barcode"
            {...register('barcode')}
          />
        </div>

        {/* Storage Location */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="storageLocationId">Local de Armazenamento (opcional)</Label>
            <button
              type="button"
              onClick={() => setShowLocalModal(true)}
              className="text-xs text-primary hover:underline"
            >
              + Novo local
            </button>
          </div>
          <select
            id="storageLocationId"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            {...register('storageLocationId')}
          >
            <option value="">Sem local definido</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>

        {showLocalModal && (
          <NovoLocalModal
            onCreated={(id) => {
              setValue('storageLocationId', id)
              setShowLocalModal(false)
            }}
            onClose={() => setShowLocalModal(false)}
          />
        )}

        {/* API error */}
        {apiError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded p-2">{apiError}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.push(`/stock/items/${id}`)} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </div>
  )
}
