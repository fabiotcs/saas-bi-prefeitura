'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { api } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useQuery } from '@tanstack/react-query'

interface StorageLocation {
  id: string
  name: string
}

interface MovimentarEstoqueModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemId: string
  itemName: string
  onSuccess: () => void
}

interface MovementFormValues {
  type: 'IN' | 'OUT' | 'TRANSFER'
  quantity: number
  notes: string
  targetLocationId: string
}

export function MovimentarEstoqueModal({
  open,
  onOpenChange,
  itemId,
  itemName,
  onSuccess,
}: MovimentarEstoqueModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<MovementFormValues>({
    defaultValues: { type: 'IN', quantity: 1, notes: '', targetLocationId: '' },
  })

  const movementType = watch('type')

  const { data: locationsData } = useQuery({
    queryKey: ['stock-locations'],
    queryFn: async () => {
      const { data } = await api.get<{ data: StorageLocation[] }>('/api/stock/locations')
      return data
    },
    enabled: open,
  })

  const locations = locationsData?.data ?? []

  async function onSubmit(values: MovementFormValues) {
    setSubmitting(true)
    setApiError(null)
    try {
      await api.post('/api/stock/movements', {
        type: values.type,
        itemId,
        quantity: Number(values.quantity),
        notes: values.notes || undefined,
        targetLocationId: values.type === 'TRANSFER' && values.targetLocationId
          ? values.targetLocationId
          : undefined,
      })
      reset()
      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string } } }
      if (axiosErr.response?.status === 422) {
        setApiError(axiosErr.response.data?.error ?? 'Quantidade insuficiente em estoque')
      } else {
        setApiError('Erro ao registrar movimentação. Tente novamente.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose(open: boolean) {
    if (!open) {
      reset()
      setApiError(null)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Movimentar Estoque</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-2">{itemName}</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type */}
          <div className="space-y-1.5">
            <Label htmlFor="mov-type">Tipo de Movimentação</Label>
            <select
              id="mov-type"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...register('type', { required: true })}
            >
              <option value="IN">Entrada</option>
              <option value="OUT">Saída</option>
              <option value="TRANSFER">Transferência</option>
            </select>
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <Label htmlFor="mov-qty">Quantidade</Label>
            <Input
              id="mov-qty"
              type="number"
              min={1}
              step={1}
              {...register('quantity', {
                required: 'Quantidade é obrigatória',
                min: { value: 1, message: 'Quantidade deve ser maior que 0' },
                valueAsNumber: true,
              })}
            />
            {errors.quantity && (
              <p className="text-xs text-destructive">{errors.quantity.message}</p>
            )}
          </div>

          {/* Target location (only for TRANSFER) */}
          {movementType === 'TRANSFER' && (
            <div className="space-y-1.5">
              <Label htmlFor="mov-location">Local de Destino</Label>
              <select
                id="mov-location"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...register('targetLocationId')}
              >
                <option value="">Selecione o local</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="mov-notes">Observações (opcional)</Label>
            <Input
              id="mov-notes"
              type="text"
              placeholder="Motivo ou referência..."
              {...register('notes')}
            />
          </div>

          {/* API error */}
          {apiError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded p-2">{apiError}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
