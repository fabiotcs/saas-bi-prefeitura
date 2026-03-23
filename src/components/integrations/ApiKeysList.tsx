'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { revokeApiKey } from '@/services/integrations.service'
import type { ApiKey } from '@/services/integrations.service'

interface ApiKeysListProps {
  apiKeys: ApiKey[]
  isLoading: boolean
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR')
}

export function ApiKeysList({ apiKeys, isLoading }: ApiKeysListProps) {
  const [revoking, setRevoking] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeApiKey(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      void queryClient.invalidateQueries({ queryKey: ['integration-stats'] })
    },
  })

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando chaves...</p>
  }

  if (apiKeys.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma API Key cadastrada.</p>
  }

  async function handleRevoke(id: string) {
    if (!confirm('Tem certeza que deseja revogar esta API Key? Esta ação não pode ser desfeita.')) return
    setRevoking(id)
    try {
      await revokeMutation.mutateAsync(id)
    } finally {
      setRevoking(null)
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Nome</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Permissões</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Último Uso</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Status</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Criado em</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {apiKeys.map((key) => (
            <tr key={key.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-3 py-2 text-xs font-medium">{key.name}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {key.permissions.length > 0 ? key.permissions.join(', ') : 'Todas'}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(key.lastUsedAt)}</td>
              <td className="px-3 py-2">
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ${
                    key.revoked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}
                >
                  {key.revoked ? 'Revogada' : 'Ativa'}
                </span>
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(key.createdAt)}
              </td>
              <td className="px-3 py-2">
                {!key.revoked && (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={revoking === key.id}
                    onClick={() => handleRevoke(key.id)}
                  >
                    {revoking === key.id ? 'Revogando...' : 'Revogar'}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
