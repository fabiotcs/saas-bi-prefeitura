'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  onCreated: (id: string) => void
  onClose: () => void
}

export function NovoLocalModal({ onCreated, onClose }: Props) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [observations, setObservations] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (body: { name: string; observations?: string }) =>
      api.post<{ id: string; name: string }>('/api/stock/locations', body),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ['stock-locations'] })
      onCreated(data.id)
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr.response?.data?.error ?? 'Erro ao criar local.')
    },
  })

  function handleSubmit() {
    if (!name.trim()) { setError('Nome é obrigatório'); return }
    mutation.mutate({ name: name.trim(), observations: observations.trim() || undefined })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-background rounded-xl border shadow-xl p-6 w-full max-w-sm space-y-4 mx-4">
        <h2 className="font-semibold text-base">Novo Local de Armazenamento</h2>

        <div className="space-y-1.5">
          <Label htmlFor="modal-loc-name">Nome <span className="text-destructive">*</span></Label>
          <Input
            id="modal-loc-name"
            placeholder="Ex: Almoxarifado Central"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="modal-loc-obs">Observações (opcional)</Label>
          <Input
            id="modal-loc-obs"
            placeholder="Ex: Prateleira B, Sala 12"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded p-2">{error}</p>
        )}

        <div className="flex gap-3 pt-1">
          <Button onClick={handleSubmit} disabled={mutation.isPending} className="flex-1">
            {mutation.isPending ? 'Criando...' : 'Criar Local'}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
