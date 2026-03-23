'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createApiKey } from '@/services/integrations.service'

interface FormValues {
  name: string
  permissions: string
}

interface ApiKeyCreateModalProps {
  onCreated: () => void
  onClose: () => void
}

export function ApiKeyCreateModal({ onCreated, onClose }: ApiKeyCreateModalProps) {
  const [rawKey, setRawKey] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>()

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    setError(null)
    try {
      const permissions = values.permissions
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
      const result = await createApiKey({ name: values.name, permissions })
      setRawKey(result.rawKey)
      onCreated()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Erro ao criar API Key.')
    } finally {
      setSubmitting(false)
    }
  }

  // Confirmation screen after creation
  if (rawKey) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 space-y-2">
          <p className="text-sm font-semibold text-yellow-900">
            Guarde esta chave — ela não será exibida novamente!
          </p>
          <p className="font-mono text-xs break-all bg-white border rounded p-2">{rawKey}</p>
        </div>
        <Button onClick={onClose}>Fechar</Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-1">
        <Label htmlFor="api-key-name">Nome *</Label>
        <Input
          id="api-key-name"
          {...register('name', { required: 'Nome obrigatório' })}
          placeholder="Ex.: Sistema ERP"
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="api-key-permissions">Permissões (opcional, separadas por vírgula)</Label>
        <Input
          id="api-key-permissions"
          {...register('permissions')}
          placeholder="read:orders, read:establishments"
        />
        <p className="text-xs text-muted-foreground">Deixe em branco para acesso total.</p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Criando...' : 'Criar API Key'}
        </Button>
      </div>
    </form>
  )
}
