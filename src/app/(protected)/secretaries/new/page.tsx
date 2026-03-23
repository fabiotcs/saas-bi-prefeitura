'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createSecretary, listSecretaries } from '@/services/secretary.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRequireRole } from '@/hooks/useRequireRole'
import { formatCNPJ, isValidCNPJ } from '@/lib/cnpj'

export default function NewSecretaryPage() {
  useRequireRole(['MAIN_MANAGER'], '/dashboard')
  const router = useRouter()

  const [form, setForm] = useState({
    name: '', phone: '', cnpj: '', description: '', secretaryPersonName: '',
    budgetAllocated: '', parentId: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: parentsData } = useQuery({
    queryKey: ['secretaries-parents'],
    queryFn: () => listSecretaries({ limit: 100 }),
  })
  const parents = (parentsData?.data ?? []).filter(s => !s.parentId)

  function handleCNPJ(value: string) {
    setForm(f => ({ ...f, cnpj: formatCNPJ(value) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!isValidCNPJ(form.cnpj)) {
      setError('CNPJ inválido')
      return
    }

    setLoading(true)
    try {
      await createSecretary({
        name: form.name,
        phone: form.phone,
        cnpj: form.cnpj,
        description: form.description || undefined,
        secretaryPersonName: form.secretaryPersonName,
        budgetAllocated: form.budgetAllocated ? parseFloat(form.budgetAllocated) : 0,
        parentId: form.parentId || undefined,
      })
      router.push('/secretaries')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e.response?.data?.error ?? 'Erro ao criar secretaria')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Nova Secretaria</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="secretaryPersonName">Nome do Secretário *</Label>
            <Input id="secretaryPersonName" value={form.secretaryPersonName} onChange={e => setForm(f => ({ ...f, secretaryPersonName: e.target.value }))} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cnpj">CNPJ *</Label>
            <Input id="cnpj" value={form.cnpj} onChange={e => handleCNPJ(e.target.value)} placeholder="XX.XXX.XXX/XXXX-XX" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">Telefone *</Label>
            <Input id="phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="budgetAllocated">Orçamento Alocado (R$)</Label>
            <Input id="budgetAllocated" type="number" min="0" step="0.01" value={form.budgetAllocated} onChange={e => setForm(f => ({ ...f, budgetAllocated: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="parentId">Secretaria Pai (opcional)</Label>
            <select
              id="parentId"
              value={form.parentId}
              onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Nenhuma (secretaria principal)</option>
              {parents.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="description">Descrição</Label>
          <textarea
            id="description"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Criar Secretaria'}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        </div>
      </form>
    </div>
  )
}
