'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRequireRole } from '@/hooks/useRequireRole'
import { getSettings, updateSettings } from '@/services/settings.service'
import { SettingsForm } from '@/components/settings/SettingsForm'
import type { UpdateSettingsDto } from '@/services/settings.service'

export default function SettingsPage() {
  useRequireRole(['MAIN_MANAGER'], '/dashboard')

  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  })

  const mutation = useMutation({
    mutationFn: (dto: UpdateSettingsDto) => updateSettings(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações do Sistema</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie as configurações globais da plataforma
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Carregando configurações...</p>
      )}

      {isError && (
        <p className="text-sm text-destructive">Erro ao carregar configurações.</p>
      )}

      {data && (
        <SettingsForm
          initialSettings={data}
          onSave={async (dto) => { await mutation.mutateAsync(dto) }}
        />
      )}
    </div>
  )
}
