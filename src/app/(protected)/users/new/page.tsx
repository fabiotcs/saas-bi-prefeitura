'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createUser } from '@/services/user.service'
import { formatCPF, isValidCPF } from '@/lib/cpf'
import { useRequireRole } from '@/hooks/useRequireRole'
import type { UserRole } from '@prisma/client'

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: 'MAIN_MANAGER', label: 'Gestor Principal', description: 'Acesso total ao sistema' },
  { value: 'SECRETARY_MANAGER', label: 'Gestor de Secretaria', description: 'Gerencia sua secretaria' },
  { value: 'SECRETARY_USER', label: 'Usuário de Secretaria', description: 'Cria e consulta OS' },
  { value: 'AUDIT_VIEWER', label: 'Auditor (TCE/MP)', description: 'Somente visualização de auditoria' },
]

export default function NewUserPage() {
  useRequireRole(['MAIN_MANAGER', 'SECRETARY_MANAGER'], '/users')

  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    fullName: '', birthDate: '', phone: '',
    email: '', cpf: '', rg: '',
    role: '' as UserRole | '',
    secretaryId: '', password: '',
    approvalLimit: '',
  })

  function set(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!isValidCPF(form.cpf)) {
      setError('CPF inválido. Verifique os dígitos.')
      return
    }

    setLoading(true)
    try {
      await createUser({
        fullName: form.fullName,
        birthDate: form.birthDate,
        phone: form.phone,
        email: form.email,
        cpf: form.cpf,
        rg: form.rg,
        role: form.role as UserRole,
        secretaryId: form.secretaryId || undefined,
        password: form.password || undefined,
        approvalLimit: form.approvalLimit ? parseFloat(form.approvalLimit) : 0,
      })
      router.push('/users')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e?.response?.data?.error ?? 'Erro ao criar usuário.')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Novo Usuário</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Nome Completo *</label>
            <Input required value={form.fullName} onChange={e => set('fullName', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Data de Nascimento *</label>
            <Input required type="date" value={form.birthDate} onChange={e => set('birthDate', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telefone *</label>
            <Input required value={form.phone} placeholder="(XX) XXXXX-XXXX" onChange={e => set('phone', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">E-mail *</label>
            <Input required type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">CPF *</label>
            <Input
              required
              value={form.cpf}
              placeholder="XXX.XXX.XXX-XX"
              maxLength={14}
              onChange={e => set('cpf', formatCPF(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">RG *</label>
            <Input required value={form.rg} onChange={e => set('rg', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Perfil de Acesso *</label>
            <Select required value={form.role} onValueChange={v => set('role', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar perfil..." />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(opt => (
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
          <div>
            <label className="block text-sm font-medium mb-1">Senha inicial</label>
            <Input type="password" value={form.password} placeholder="Mudar@123 (padrão)" onChange={e => set('password', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Limite de Aprovação (R$)</label>
            <Input type="number" min="0" step="0.01" value={form.approvalLimit} placeholder="0 = sem limite" onChange={e => set('approvalLimit', e.target.value)} />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Criar Usuário'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
