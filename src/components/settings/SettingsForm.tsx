'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SystemSettings, UpdateSettingsDto } from '@/services/settings.service'

interface ToggleSwitchProps {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
}

function ToggleSwitch({ id, checked, onChange, label, description }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="space-y-0.5">
        <label htmlFor={id} className="text-sm font-medium cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          checked ? 'bg-primary' : 'bg-input'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-background shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

interface SettingsFormProps {
  initialSettings: SystemSettings
  onSave: (dto: UpdateSettingsDto) => Promise<void>
}

export function SettingsForm({ initialSettings, onSave }: SettingsFormProps) {
  const [billingMode, setBillingMode] = useState<'CENTRALIZED' | 'DECENTRALIZED'>(
    initialSettings.billingMode
  )
  const [billingClosingDay, setBillingClosingDay] = useState(
    String(initialSettings.billingClosingDay)
  )
  const [requireManagerApproval, setRequireManagerApproval] = useState(
    initialSettings.requireManagerApproval
  )
  const [requireBudgetValidation, setRequireBudgetValidation] = useState(
    initialSettings.requireBudgetValidation
  )
  const [restrictOrderCreationToVerifiedUsers, setRestrictOrderCreation] = useState(
    initialSettings.restrictOrderCreationToVerifiedUsers
  )
  const [minimumProposalsForApproval, setMinimumProposals] = useState(
    String(initialSettings.minimumProposalsForApproval)
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const closingDay = parseInt(billingClosingDay)
    if (isNaN(closingDay) || closingDay < 1 || closingDay > 28) {
      setError('Dia de fechamento deve estar entre 1 e 28.')
      return
    }

    const proposals = parseInt(minimumProposalsForApproval)
    if (isNaN(proposals) || proposals < 1 || proposals > 10) {
      setError('Mínimo de propostas deve estar entre 1 e 10.')
      return
    }

    setLoading(true)
    try {
      await onSave({
        billingMode,
        billingClosingDay: closingDay,
        requireManagerApproval,
        requireBudgetValidation,
        restrictOrderCreationToVerifiedUsers,
        minimumProposalsForApproval: proposals,
      })
      setSuccess(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Erro ao salvar configurações.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Billing Configuration */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="text-base font-semibold">Configurações de Faturamento</h2>

        <div className="space-y-1">
          <label className="text-sm font-medium">Modo de Faturamento</label>
          <Select
            value={billingMode}
            onValueChange={(v) => setBillingMode(v as 'CENTRALIZED' | 'DECENTRALIZED')}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecione o modo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CENTRALIZED">Centralizado</SelectItem>
              <SelectItem value="DECENTRALIZED">Descentralizado</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Define se o faturamento é realizado de forma centralizada ou por secretaria.
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="billingClosingDay" className="text-sm font-medium">
            Dia de Fechamento (1-28)
          </label>
          <Input
            id="billingClosingDay"
            type="number"
            min={1}
            max={28}
            value={billingClosingDay}
            onChange={(e) => setBillingClosingDay(e.target.value)}
            className="w-32"
          />
          <p className="text-xs text-muted-foreground">
            Dia do mês em que o período de faturamento é encerrado.
          </p>
        </div>
      </div>

      {/* Approval Configuration */}
      <div className="rounded-xl border bg-card p-5 space-y-2">
        <h2 className="text-base font-semibold mb-2">Configurações de Aprovação</h2>

        <ToggleSwitch
          id="requireManagerApproval"
          checked={requireManagerApproval}
          onChange={setRequireManagerApproval}
          label="Exigir aprovação do gestor"
          description="Pedidos precisam ser aprovados por um gestor antes de avançar."
        />

        <ToggleSwitch
          id="requireBudgetValidation"
          checked={requireBudgetValidation}
          onChange={setRequireBudgetValidation}
          label="Exigir validação orçamentária"
          description="Verificação de saldo orçamentário antes de criar pedidos."
        />

        <ToggleSwitch
          id="restrictOrderCreation"
          checked={restrictOrderCreationToVerifiedUsers}
          onChange={setRestrictOrderCreation}
          label="Restringir criação de pedidos a usuários verificados"
          description="Apenas usuários com documentos verificados podem criar pedidos."
        />

        <div className="space-y-1 pt-2">
          <label htmlFor="minimumProposals" className="text-sm font-medium">
            Mínimo de Propostas para Aprovação (1-10)
          </label>
          <Input
            id="minimumProposals"
            type="number"
            min={1}
            max={10}
            value={minimumProposalsForApproval}
            onChange={(e) => setMinimumProposals(e.target.value)}
            className="w-24"
          />
          <p className="text-xs text-muted-foreground">
            Número mínimo de propostas necessárias para que um pedido possa ser aprovado.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">Configurações salvas com sucesso!</p>}

      <Button type="submit" disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar Configurações'}
      </Button>
    </form>
  )
}
