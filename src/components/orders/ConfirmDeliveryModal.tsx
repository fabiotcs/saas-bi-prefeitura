'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PhotoUploader } from './PhotoUploader'

interface ConfirmDeliveryModalProps {
  orderId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ConfirmDeliveryModal({
  orderId,
  open,
  onClose,
  onSuccess,
}: ConfirmDeliveryModalProps) {
  const [photos, setPhotos] = useState<File[]>([])
  const [observations, setObservations] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setError(null)
    setLoading(true)

    try {
      const formData = new FormData()
      photos.forEach((f) => formData.append('photos', f))
      formData.append('observations', observations)

      const res = await fetch(`/api/orders/${orderId}/confirm-delivery`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Erro ao confirmar recebimento')
      }

      onSuccess()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setPhotos([])
    setObservations('')
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirmar Recebimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Fotos do recebimento</label>
            <PhotoUploader onFilesChange={setPhotos} maxFiles={10} label="Adicionar foto" />
          </div>

          <div>
            <label htmlFor="delivery-observations" className="text-sm font-medium mb-1 block">
              Observações <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <textarea
              id="delivery-observations"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
              placeholder="Descreva detalhes do recebimento..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? 'Confirmando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
