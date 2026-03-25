'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const ROLE_LABELS: Record<string, string> = {
  MAIN_MANAGER: 'Gestor Principal',
  SECRETARY_MANAGER: 'Gestor de Secretaria',
  SECRETARY_USER: 'Usuário de Secretaria',
  AUDIT_VIEWER: 'Auditor',
}

export default function ProfilePage() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const setAuth = useAuthStore((state) => state.setAuth)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setFullName(user.fullName ?? '')
    }
  }, [user])

  // Carregar telefone do servidor pois o store não persiste
  useEffect(() => {
    if (!user?.id) return
    api.get<{ phone?: string }>(`/api/users/${user.id}`)
      .then(({ data }) => setPhone(data.phone ?? ''))
      .catch(() => {})
  }, [user?.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    setLoading(true)
    setError('')
    setSuccess(false)
    try {
      const { data } = await api.patch<{ fullName: string }>(`/api/users/${user.id}`, {
        fullName,
        phone,
      })
      // Atualiza o store com o novo nome
      const token = localStorage.getItem('access_token') ?? ''
      const refresh = localStorage.getItem('refresh_token') ?? ''
      setAuth(token, refresh, { ...user, fullName: data.fullName })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr.response?.data?.error ?? 'Erro ao salvar perfil.')
    } finally {
      setLoading(false)
    }
  }

  const initials = user?.fullName
    ? user.fullName.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : '?'

  return (
    <div className="p-6 max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground mt-1">Edite suas informações pessoais</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold shrink-0">
          {initials}
        </div>
        <div>
          <p className="font-semibold text-base">{user?.fullName}</p>
          <p className="text-sm text-muted-foreground">{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Nome Completo <span className="text-destructive">*</span></Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(XX) XXXXX-XXXX"
          />
        </div>

        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input value={user?.email ?? ''} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado.</p>
        </div>

        <div className="space-y-1.5">
          <Label>Perfil de Acesso</Label>
          <Input value={ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? ''} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground">O perfil é gerenciado pelo administrador.</p>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded p-2">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-700 bg-green-50 rounded p-2">Perfil atualizado com sucesso!</p>
        )}

        <div className="flex gap-3 pt-1">
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
