'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRequireRole } from '@/hooks/useRequireRole'

interface StorageLocation {
  id: string
  name: string
  observations?: string | null
  _count: { stockItems: number }
  secretary?: { id: string; name: string } | null
}

export default function StorageLocationsPage() {
  useRequireRole(['MAIN_MANAGER', 'SECRETARY_MANAGER'], '/stock')

  const queryClient = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [observations, setObservations] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editObs, setEditObs] = useState('')
  const [editError, setEditError] = useState<string | null>(null)

  const [deleteError, setDeleteError] = useState<Record<string, string>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['stock-locations'],
    queryFn: async () => {
      const { data } = await api.get<{ data: StorageLocation[] }>('/api/stock/locations')
      return data
    },
  })

  const locations = data?.data ?? []

  const createMutation = useMutation({
    mutationFn: (body: { name: string; observations?: string }) =>
      api.post('/api/stock/locations', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-locations'] })
      setName('')
      setObservations('')
      setShowForm(false)
      setFormError(null)
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setFormError(axiosErr.response?.data?.error ?? 'Erro ao criar local.')
    },
  })

  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name: string; observations?: string } }) =>
      api.patch(`/api/stock/locations/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-locations'] })
      setEditingId(null)
      setEditError(null)
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setEditError(axiosErr.response?.data?.error ?? 'Erro ao editar local.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/stock/locations/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['stock-locations'] })
      setDeleteError((prev) => { const next = { ...prev }; delete next[id]; return next })
    },
    onError: (err: unknown, id: string) => {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setDeleteError((prev) => ({
        ...prev,
        [id]: axiosErr.response?.data?.error ?? 'Erro ao excluir.',
      }))
    },
  })

  function startEdit(loc: StorageLocation) {
    setEditingId(loc.id)
    setEditName(loc.name)
    setEditObs(loc.observations ?? '')
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError(null)
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/stock" className="hover:underline">Estoque</Link>
            <span>/</span>
            <span>Locais de Armazenamento</span>
          </div>
          <h1 className="text-2xl font-bold">Locais de Armazenamento</h1>
        </div>
        <Button onClick={() => { setShowForm((v) => !v); setFormError(null) }}>
          {showForm ? 'Cancelar' : '+ Novo Local'}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm">Novo Local</h2>
          <div className="space-y-1.5">
            <Label htmlFor="loc-name">Nome <span className="text-destructive">*</span></Label>
            <Input
              id="loc-name"
              placeholder="Ex: Almoxarifado Central"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loc-obs">Observações (opcional)</Label>
            <Input
              id="loc-obs"
              placeholder="Ex: Prateleira B, Sala 12"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
            />
          </div>
          {formError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded p-2">{formError}</p>
          )}
          <div className="flex gap-3">
            <Button
              onClick={() => {
                if (!name.trim()) { setFormError('Nome é obrigatório'); return }
                createMutation.mutate({ name: name.trim(), observations: observations.trim() || undefined })
              }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Criando...' : 'Criar Local'}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setFormError(null) }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Locations table */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : locations.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center space-y-2">
          <p className="text-muted-foreground text-sm">Nenhum local cadastrado.</p>
          <p className="text-xs text-muted-foreground">Clique em &quot;+ Novo Local&quot; para começar.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Nome</th>
                <th className="text-left p-3 font-medium">Observações</th>
                <th className="text-center p-3 font-medium">Itens</th>
                <th className="p-3 w-40" />
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc.id} className="border-t hover:bg-muted/30 transition-colors">
                  {editingId === loc.id ? (
                    <>
                      <td className="p-2" colSpan={2}>
                        <div className="flex gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Nome"
                            className="h-8 text-sm"
                          />
                          <Input
                            value={editObs}
                            onChange={(e) => setEditObs(e.target.value)}
                            placeholder="Observações"
                            className="h-8 text-sm"
                          />
                        </div>
                        {editError && (
                          <p className="text-xs text-destructive mt-1">{editError}</p>
                        )}
                      </td>
                      <td className="p-2 text-center text-muted-foreground text-xs">
                        {loc._count.stockItems}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            onClick={() => editMutation.mutate({ id: loc.id, body: { name: editName.trim(), observations: editObs.trim() || undefined } })}
                            disabled={editMutation.isPending}
                          >
                            Salvar
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            Cancelar
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-3 font-medium">{loc.name}</td>
                      <td className="p-3 text-muted-foreground text-xs">{loc.observations ?? '—'}</td>
                      <td className="p-3 text-center text-muted-foreground text-xs">
                        {loc._count.stockItems}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(loc)}>
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setDeleteError((prev) => { const next = { ...prev }; delete next[loc.id]; return next })
                              deleteMutation.mutate(loc.id)
                            }}
                            disabled={deleteMutation.isPending && deleteMutation.variables === loc.id}
                          >
                            Excluir
                          </Button>
                        </div>
                        {deleteError[loc.id] && (
                          <p className="text-xs text-destructive mt-1 text-right">{deleteError[loc.id]}</p>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
