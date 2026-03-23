'use client'

import type { ReportType } from '@/services/reports.service'

const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
  { value: 'ORDERS', label: 'Pedidos', description: 'Listagem de ordens de serviço' },
  { value: 'ESTABLISHMENTS', label: 'Estabelecimentos', description: 'Rede credenciada' },
  { value: 'PRODUCT_VALUE', label: 'Valor de Produtos', description: 'Preços mín/méd/máx por produto' },
  { value: 'EXPENSES_BY_PERIOD', label: 'Despesas por Período', description: 'Gastos mensais agregados' },
  { value: 'TOP_PRODUCTS', label: 'Top Produtos', description: 'Produtos mais solicitados' },
  { value: 'OPERATIONS_LOG', label: 'Log de Operações', description: 'Histórico de auditoria' },
]

interface ReportTypeSelectorProps {
  value: ReportType
  onChange: (type: ReportType) => void
}

export function ReportTypeSelector({ value, onChange }: ReportTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {REPORT_TYPES.map((rt) => (
        <button
          key={rt.value}
          type="button"
          onClick={() => onChange(rt.value)}
          className={`rounded-lg border p-3 text-left transition-colors ${
            value === rt.value
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-border hover:border-primary/40 hover:bg-muted/50'
          }`}
        >
          <p className="text-sm font-medium">{rt.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{rt.description}</p>
        </button>
      ))}
    </div>
  )
}
