'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRequireRole } from '@/hooks/useRequireRole'
import { TwoFactorModal } from '@/components/auth/TwoFactorModal'
import {
  listContracts,
  getContractById,
  addAdditive,
  addCommitment,
  type BudgetContract,
  type BudgetAdditive,
  type BudgetCommitment,
} from '@/services/budget.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { TwoFactorAction } from '@prisma/client'

// ---- Progress Bar ----

interface BudgetBarProps {
  label: string
  value: number
  total: number
  colorClass: string
}

function BudgetBar({ label, value, total, colorClass }: BudgetBarProps) {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 w-full rounded bg-muted overflow-hidden">
        <div
          className={`h-full rounded ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de R${' '}
        {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </p>
    </div>
  )
}

// ---- Status Badge ----

function CommitmentStatusBadge({ status }: { status: BudgetCommitment['status'] }) {
  const map: Record<BudgetCommitment['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
    ACTIVE: { label: 'Ativo', variant: 'default' },
    CONSUMED: { label: 'Consumido', variant: 'secondary' },
    CANCELLED: { label: 'Cancelado', variant: 'destructive' },
  }
  const cfg = map[status]
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

// ---- New Contract Form ----

interface NewContractFormProps {
  onCreated: () => void
}

function NewContractForm({ onCreated }: NewContractFormProps) {
  const [contractNumber, setContractNumber] = useState('')
  const [initialValue, setInitialValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/budget/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        body: JSON.stringify({ contractNumber, initialValue: parseFloat(initialValue) }),
      })
      if (!res.ok) {
        const data = await res.json() as { error: string }
        setError(data.error)
        return
      }
      setContractNumber('')
      setInitialValue('')
      onCreated()
    } catch {
      setError('Erro ao criar contrato.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 flex-wrap items-end">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Número do Contrato</label>
        <Input
          value={contractNumber}
          onChange={(e) => setContractNumber(e.target.value)}
          placeholder="Ex: 008/2026"
          className="w-48"
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Valor Inicial (R$)</label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          value={initialValue}
          onChange={(e) => setInitialValue(e.target.value)}
          placeholder="0,00"
          className="w-40"
          required
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? 'Criando...' : 'Criar'}
      </Button>
      {error && <p className="text-sm text-destructive w-full">{error}</p>}
    </form>
  )
}

// ---- Additive Form ----

interface AdditiveFormProps {
  contractId: string
  onCreated: () => void
}

function AdditiveForm({ contractId, onCreated }: AdditiveFormProps) {
  const [showForm, setShowForm] = useState(false)
  const [value, setValue] = useState('')
  const [description, setDescription] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRequestTwoFactor = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setShowTwoFactor(true)
  }

  const handleTwoFactorSuccess = async (otpToken: string, code: string) => {
    setShowTwoFactor(false)
    setLoading(true)
    try {
      await addAdditive(contractId, {
        value: parseFloat(value),
        description,
        otpCode: code,
        twoFactorRequestId: otpToken,
        fileUrl: fileUrl || undefined,
      })
      setValue('')
      setDescription('')
      setFileUrl('')
      setShowForm(false)
      onCreated()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Erro ao adicionar aditivo.')
    } finally {
      setLoading(false)
    }
  }

  if (!showForm) {
    return (
      <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
        + Novo Aditivo
      </Button>
    )
  }

  return (
    <>
      <form onSubmit={handleRequestTwoFactor} className="space-y-3 rounded-lg border p-4">
        <h4 className="text-sm font-semibold">Novo Aditivo</h4>
        <div className="flex gap-2 flex-wrap">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Valor (R$)</label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0,00"
              className="w-36"
              required
            />
          </div>
          <div className="space-y-1 flex-1">
            <label className="text-xs text-muted-foreground">Descrição</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Motivo do aditivo..."
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">URL do Arquivo (opcional)</label>
            <Input
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://..."
              className="w-64"
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? 'Aguarde...' : 'Confirmar com 2FA'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setShowForm(false); setError(null) }}
          >
            Cancelar
          </Button>
        </div>
      </form>

      <TwoFactorModal
        isOpen={showTwoFactor}
        action={TwoFactorAction.SUBMIT_ADDITIVE}
        onSuccess={handleTwoFactorSuccess}
        onCancel={() => setShowTwoFactor(false)}
      />
    </>
  )
}

// ---- Commitment Form ----

interface CommitmentFormProps {
  contractId: string
  onCreated: () => void
}

function CommitmentForm({ contractId, onCreated }: CommitmentFormProps) {
  const [showForm, setShowForm] = useState(false)
  const [secretaryId, setSecretaryId] = useState('')
  const [value, setValue] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Load secretaries for the select
  const { data: secretariesData } = useQuery({
    queryKey: ['secretaries-select'],
    queryFn: async () => {
      const res = await fetch('/api/secretaries?limit=100', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      })
      const json = await res.json() as { data: { id: string; name: string }[] }
      return json.data
    },
    enabled: showForm,
  })

  const handleRequestTwoFactor = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setShowTwoFactor(true)
  }

  const handleTwoFactorSuccess = async (otpToken: string, code: string) => {
    setShowTwoFactor(false)
    setLoading(true)
    try {
      await addCommitment(contractId, {
        secretaryId,
        value: parseFloat(value),
        otpCode: code,
        twoFactorRequestId: otpToken,
        fileUrl: fileUrl || undefined,
      })
      setSecretaryId('')
      setValue('')
      setFileUrl('')
      setShowForm(false)
      onCreated()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Erro ao registrar empenho.')
    } finally {
      setLoading(false)
    }
  }

  if (!showForm) {
    return (
      <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
        + Novo Empenho
      </Button>
    )
  }

  return (
    <>
      <form onSubmit={handleRequestTwoFactor} className="space-y-3 rounded-lg border p-4">
        <h4 className="text-sm font-semibold">Novo Empenho</h4>
        <div className="flex gap-2 flex-wrap">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Secretaria</label>
            <select
              value={secretaryId}
              onChange={(e) => setSecretaryId(e.target.value)}
              required
              className="flex h-9 w-56 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Selecione...</option>
              {(secretariesData ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Valor (R$)</label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0,00"
              className="w-36"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">URL do Arquivo (opcional)</label>
            <Input
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://..."
              className="w-64"
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? 'Aguarde...' : 'Confirmar com 2FA'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setShowForm(false); setError(null) }}
          >
            Cancelar
          </Button>
        </div>
      </form>

      <TwoFactorModal
        isOpen={showTwoFactor}
        action={TwoFactorAction.SUBMIT_COMMITMENT}
        onSuccess={handleTwoFactorSuccess}
        onCancel={() => setShowTwoFactor(false)}
      />
    </>
  )
}

// ---- Contract Detail Panel ----

interface ContractDetailProps {
  contractId: string
  userRole: string
}

function ContractDetail({ contractId, userRole }: ContractDetailProps) {
  const queryClient = useQueryClient()

  const { data: contract, isLoading } = useQuery({
    queryKey: ['budget-contract', contractId],
    queryFn: () => getContractById(contractId),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['budget-contract', contractId] })
    void queryClient.invalidateQueries({ queryKey: ['budget-contracts'] })
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando detalhes...</p>
  }

  if (!contract) {
    return <p className="text-sm text-destructive">Erro ao carregar contrato.</p>
  }

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR')

  return (
    <div className="space-y-6">
      {/* Additives Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Aditivos</h3>
          {userRole === 'MAIN_MANAGER' && (
            <AdditiveForm contractId={contractId} onCreated={invalidate} />
          )}
        </div>

        {(contract.additives ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum aditivo registrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Valor</th>
                  <th className="pb-2 pr-4">Descrição</th>
                  <th className="pb-2 pr-4">Data</th>
                  <th className="pb-2 pr-4">Aprovado por</th>
                  <th className="pb-2">Arquivo</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(contract.additives as BudgetAdditive[]).map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-4 font-medium">{formatCurrency(a.value)}</td>
                    <td className="py-2 pr-4">{a.description}</td>
                    <td className="py-2 pr-4">{formatDate(a.approvedAt)}</td>
                    <td className="py-2 pr-4">{a.approvedBy?.fullName ?? '-'}</td>
                    <td className="py-2">
                      {a.fileUrl ? (
                        <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs">
                          Ver arquivo
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Commitments Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Empenhos</h3>
          {(userRole === 'MAIN_MANAGER' || userRole === 'SECRETARY_MANAGER') && (
            <CommitmentForm contractId={contractId} onCreated={invalidate} />
          )}
        </div>

        {(contract.commitments ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum empenho registrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Secretaria</th>
                  <th className="pb-2 pr-4">Valor</th>
                  <th className="pb-2 pr-4">Usado</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Data</th>
                  <th className="pb-2">Arquivo</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(contract.commitments as BudgetCommitment[]).map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 pr-4">{c.secretary?.name ?? c.secretaryId}</td>
                    <td className="py-2 pr-4 font-medium">{formatCurrency(c.value)}</td>
                    <td className="py-2 pr-4">{formatCurrency(c.usedValue)}</td>
                    <td className="py-2 pr-4">
                      <CommitmentStatusBadge status={c.status} />
                    </td>
                    <td className="py-2 pr-4">{formatDate(c.registeredAt)}</td>
                    <td className="py-2">
                      {c.fileUrl ? (
                        <a href={c.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs">
                          Download
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Main Page ----

export default function BudgetPage() {
  const { user } = useRequireRole(
    ['MAIN_MANAGER', 'SECRETARY_MANAGER', 'AUDIT_VIEWER'],
    '/dashboard'
  )

  const queryClient = useQueryClient()
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null)
  const [showNewContractForm, setShowNewContractForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['budget-contracts'],
    queryFn: listContracts,
  })

  const contracts: BudgetContract[] = data?.data ?? []

  const invalidateContracts = () => {
    void queryClient.invalidateQueries({ queryKey: ['budget-contracts'] })
    setShowNewContractForm(false)
  }

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const userRole = user?.role ?? ''

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestão Orçamentária</h1>
        {userRole === 'MAIN_MANAGER' && (
          <Button onClick={() => setShowNewContractForm((v) => !v)}>
            {showNewContractForm ? 'Cancelar' : '+ Novo Contrato'}
          </Button>
        )}
      </div>

      {showNewContractForm && userRole === 'MAIN_MANAGER' && (
        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="text-sm font-semibold">Novo Contrato</h2>
          <NewContractForm onCreated={invalidateContracts} />
        </div>
      )}

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando contratos...</p>
      ) : contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
          <p className="text-muted-foreground">Nenhum contrato cadastrado.</p>
          {userRole === 'MAIN_MANAGER' && !showNewContractForm && (
            <Button onClick={() => setShowNewContractForm(true)}>+ Novo Contrato</Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Contract Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contracts.map((contract) => (
              <button
                key={contract.id}
                type="button"
                onClick={() =>
                  setSelectedContractId(
                    selectedContractId === contract.id ? null : contract.id
                  )
                }
                className={`text-left rounded-xl border bg-card p-5 space-y-4 transition-shadow hover:shadow-md ${
                  selectedContractId === contract.id ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{contract.contractNumber}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Valor atual: {formatCurrency(contract.currentTotal)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Inicial: {formatCurrency(contract.initialValue)}</p>
                    <p>Aditivos: {formatCurrency(contract.additivesTotal)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <BudgetBar
                    label="Distribuído para Secretarias"
                    value={contract.distributedToSecretaries}
                    total={contract.currentTotal}
                    colorClass="bg-blue-500"
                  />
                  <BudgetBar
                    label="Empenhos (% contratado)"
                    value={contract.allocatedViaCommitment}
                    total={contract.currentTotal}
                    colorClass="bg-amber-500"
                  />
                  <BudgetBar
                    label="Consumido em Pedidos (% consumido)"
                    value={contract.consumedInOrders}
                    total={contract.currentTotal}
                    colorClass="bg-rose-500"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Clique para ver aditivos e empenhos
                </p>
              </button>
            ))}
          </div>

          {/* Detail Panel */}
          {selectedContractId && (
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">
                Detalhes do Contrato:{' '}
                {contracts.find((c) => c.id === selectedContractId)?.contractNumber}
              </h2>
              <ContractDetail contractId={selectedContractId} userRole={userRole} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

