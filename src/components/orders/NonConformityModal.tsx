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

interface NonConformityModalProps {
  orderId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function NonConformityModal({
  orderId,
  open,
  onClose,
  onSuccess,
}: NonConformityModalProps) {
  const [photos, setPhotos] = useState<File[]>([])
  const [observations, setObservations] = useState('')
  const [observationsError, setObservationsError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRegister() {
    setObservationsError(null)
    setError(null)

    if (!observations.trim()) {
      setObservationsError('Observações são obrigatórias para registrar uma não conformidade.')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      photos.forEach((f) => formData.append('photos', f))
      formData.append('observations', observations.trim())

      const res = await fetch(`/api/orders/${orderId}/non-conformities`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Erro ao registrar não conformidade')
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
    setObservationsError(null)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Não Conformidade</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Fotos da não conformidade</label>
            <PhotoUploader onFilesChange={setPhotos} maxFiles={10} label="Adicionar foto" />
          </div>

          <div>
            <label htmlFor="nc-observations" className="text-sm font-medium mb-1 block">
              Observações <span className="text-destructive">*</span>
            </label>
            <textarea
              id="nc-observations"
              value={observations}
              onChange={(e) => {
                setObservations(e.target.value)
                if (observationsError && e.target.value.trim()) {
                  setObservationsError(null)
                }
              }}
              rows={3}
              placeholder="Descreva a não conformidade identificada..."
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none ${
                observationsError ? 'border-destructive' : 'border-input'
              }`}
            />
            {observationsError && (
              <p className="text-xs text-destructive mt-1">{observationsError}</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleRegister} disabled={loading}>
            {loading ? 'Registrando...' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
