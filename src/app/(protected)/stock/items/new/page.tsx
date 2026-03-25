'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

interface StockItemFormValues {
  name: string
  unit: string
  unitPrice: number
  minimumAlert: number
  barcode: string
  storageLocationId: string
}

export default function NewStockItemPage() {
  useRequireRole(['MAIN_MANAGER', 'SECRETARY_MANAGER'], '/stock')

  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [showLocalModal, setShowLocalModal] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<StockItemFormValues>({
    defaultValues: { name: '', unit: '', unitPrice: 0, minimumAlert: 0, barcode: '', storageLocationId: '' },
  })

  const { data: locationsData } = useQuery({
    queryKey: ['stock-locations'],
    queryFn: async () => {
      const { data } = await api.get<{ data: StorageLocation[] }>('/api/stock/locations')
      return data
    },
  })

  const locations = locationsData?.data ?? []

  async function onSubmit(values: StockItemFormValues) {
    setSubmitting(true)
    setApiError(null)
    try {
      await api.post('/api/stock/items', {
        name: values.name,
        unit: values.unit,
        unitPrice: Number(values.unitPrice),
        minimumAlert: Number(values.minimumAlert),
        barcode: values.barcode || undefined,
        storageLocationId: values.storageLocationId || undefined,
      })
      router.push('/stock')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setApiError(axiosErr.response?.data?.error ?? 'Erro ao criar item. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link href="/stock" className="hover:underline">Estoque</Link>
          <span>/</span>
          <span>Novo Item</span>
        </div>
        <h1 className="text-2xl font-bold">Novo Item de Estoque</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome <span className="text-destructive">*</span></Label>
          <Input
            id="name"
            placeholder="Ex: Caneta BIC Azul"
            {...register('name', { required: 'Nome é obrigatório' })}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        {/* Unit */}
        <div className="space-y-1.5">
          <Label htmlFor="unit">Unidade de Medida <span className="text-destructive">*</span></Label>
          <Input
            id="unit"
            placeholder="Ex: un, caixa, resma, litro"
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
            placeholder="0,00"
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
            placeholder="0"
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
            placeholder="Ex: 7891010000001"
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
            <option value="">Selecione um local</option>
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
          <Button type="button" variant="outline" onClick={() => router.push('/stock')} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Criando...' : 'Criar Item'}
          </Button>
        </div>
      </form>
    </div>
  )
}
