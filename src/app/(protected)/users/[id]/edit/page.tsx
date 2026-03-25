'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getUserById, updateUser } from '@/services/user.service'
import { useRequireRole } from '@/hooks/useRequireRole'
import type { UserRole } from '@prisma/client'

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: 'MAIN_MANAGER', label: 'Gestor Principal', description: 'Acesso total ao sistema' },
  { value: 'SECRETARY_MANAGER', label: 'Gestor de Secretaria', description: 'Gerencia sua secretaria' },
  { value: 'SECRETARY_USER', label: 'Usuário de Secretaria', description: 'Cria e consulta OS' },
  { value: 'AUDIT_VIEWER', label: 'Auditor (TCE/MP)', description: 'Somente visualização de auditoria' },
]

export default function EditUserPage() {
  useRequireRole(['MAIN_MANAGER'], '/users')

  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    role: '' as UserRole | '',
    secretaryId: '',
  })

  useEffect(() => {
    getUserById(params.id)
      .then((user) => {
        setForm({
          fullName: user.fullName ?? '',
          phone: user.phone ?? '',
          role: user.role as UserRole,
          secretaryId: user.secretaryId ?? '',
        })
      })
      .catch(() => setError('Usuário não encontrado.'))
      .finally(() => setFetching(false))
  }, [params.id])

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await updateUser(params.id, {
        fullName: form.fullName,
        phone: form.phone,
        role: form.role as UserRole,
        secretaryId: form.secretaryId || undefined,
      })
      router.push('/users')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e?.response?.data?.error ?? 'Erro ao salvar usuário.')
      setLoading(false)
    }
  }

  if (fetching) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Editar Usuário</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Nome Completo *</label>
            <Input required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telefone *</label>
            <Input required value={form.phone} placeholder="(XX) XXXXX-XXXX" onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Perfil de Acesso *</label>
            <Select required value={form.role} onValueChange={(v) => set('role', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar perfil..." />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div>
                      <p className="font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
