'use client'

import { useState, useEffect, useRef } from 'react'
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
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docLoading, setDocLoading] = useState(false)
  const [docSuccess, setDocSuccess] = useState(false)
  const [docError, setDocError] = useState('')
  const [documentVerified, setDocumentVerified] = useState<boolean | null>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      setFullName(user.fullName ?? '')
    }
  }, [user])

  // Carregar telefone e status do documento
  useEffect(() => {
    if (!user?.id) return
    api.get<{ phone?: string; documentVerified?: boolean }>(`/api/users/${user.id}`)
      .then(({ data }) => {
        setPhone(data.phone ?? '')
        setDocumentVerified(data.documentVerified ?? false)
      })
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

  async function handleDocumentUpload() {
    if (!docFile || !user?.id) return
    setDocLoading(true)
    setDocError('')
    setDocSuccess(false)
    try {
      const form = new FormData()
      form.append('document', docFile)
      await api.post(`/api/users/${user.id}/document-photo`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setDocSuccess(true)
      setDocFile(null)
      if (docInputRef.current) docInputRef.current.value = ''
      setTimeout(() => setDocSuccess(false), 3000)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setDocError(axiosErr.response?.data?.error ?? 'Erro ao enviar documento.')
    } finally {
      setDocLoading(false)
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

      {/* Seção de validação biométrica de documento */}
      <div className="border-t pt-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold">Documento de Identificação</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Envie a foto do seu RG ou CNH para validação biométrica automatizada.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          {documentVerified === null ? (
            <span className="text-xs text-muted-foreground">Carregando...</span>
          ) : documentVerified ? (
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 border border-green-200">
              Documento Validado
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
              Pendente de Validação
            </span>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="docUpload">Foto do RG / CNH (frente)</Label>
          <Input
            id="docUpload"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            ref={docInputRef}
            onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-muted-foreground">
            Formatos aceitos: JPEG, PNG, WEBP. Tamanho máximo: 5 MB.
          </p>
        </div>

        {docError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded p-2">{docError}</p>
        )}
        {docSuccess && (
          <p className="text-sm text-green-700 bg-green-50 rounded p-2">
            Documento enviado com sucesso! A validação ocorrerá no próximo login biométrico.
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          disabled={!docFile || docLoading}
          onClick={handleDocumentUpload}
        >
          {docLoading ? 'Enviando...' : 'Enviar Documento'}
        </Button>
      </div>
    </div>
  )
}
