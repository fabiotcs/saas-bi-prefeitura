'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ReportFilters, ReportType } from '@/services/reports.service'

interface ReportFiltersFormProps {
  type: ReportType
  filters: ReportFilters
  onChange: (filters: ReportFilters) => void
}

export function ReportFiltersForm({ type, filters, onChange }: ReportFiltersFormProps) {
  function set(key: keyof ReportFilters, value: string) {
    onChange({ ...filters, [key]: value || undefined })
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Date range — available for all types */}
      <div className="space-y-1">
        <Label htmlFor="filter-from">Data Início</Label>
        <Input
          id="filter-from"
          type="date"
          value={filters.from ?? ''}
          onChange={(e) => set('from', e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-to">Data Fim</Label>
        <Input
          id="filter-to"
          type="date"
          value={filters.to ?? ''}
          onChange={(e) => set('to', e.target.value)}
        />
      </div>

      {/* Status filter for ORDERS */}
      {type === 'ORDERS' && (
        <div className="space-y-1">
          <Label htmlFor="filter-status">Status</Label>
          <select
            id="filter-status"
            value={filters.status ?? ''}
            onChange={(e) => set('status', e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Todos</option>
            <option value="DRAFT">Rascunho</option>
            <option value="OPEN">Aberto</option>
            <option value="IN_QUOTATION">Em Cotação</option>
            <option value="APPROVED">Aprovado</option>
            <option value="DELIVERED">Entregue</option>
            <option value="COMPLETED">Concluído</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </div>
      )}

      {/* Product name filter */}
      {(type === 'PRODUCT_VALUE' || type === 'TOP_PRODUCTS') && (
        <div className="space-y-1">
          <Label htmlFor="filter-product">Produto</Label>
          <Input
            id="filter-product"
            placeholder="Filtrar por produto..."
            value={filters.productName ?? ''}
            onChange={(e) => set('productName', e.target.value)}
          />
        </div>
      )}

      {/* User filter for OPERATIONS_LOG */}
      {type === 'OPERATIONS_LOG' && (
        <div className="space-y-1">
          <Label htmlFor="filter-user">ID do Usuário</Label>
          <Input
            id="filter-user"
            placeholder="UUID do usuário..."
            value={filters.userId ?? ''}
            onChange={(e) => set('userId', e.target.value)}
          />
        </div>
      )}
    </div>
  )
}
