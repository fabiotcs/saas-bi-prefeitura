'use client'

import { useState } from 'react'
import { useRequireRole } from '@/hooks/useRequireRole'
import { previewReport } from '@/services/reports.service'
import { ReportTypeSelector } from '@/components/reports/ReportTypeSelector'
import { ReportFiltersForm } from '@/components/reports/ReportFiltersForm'
import { ReportPreviewTable } from '@/components/reports/ReportPreviewTable'
import { ReportExportButtons } from '@/components/reports/ReportExportButtons'
import { Button } from '@/components/ui/button'
import type { ReportType, ReportFilters, ReportPreview } from '@/services/reports.service'

export default function ReportsPage() {
  useRequireRole(['MAIN_MANAGER', 'SECRETARY_MANAGER', 'AUDIT_VIEWER'], '/dashboard')

  const [type, setType] = useState<ReportType>('ORDERS')
  const [filters, setFilters] = useState<ReportFilters>({})
  const [preview, setPreview] = useState<ReportPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePreview() {
    setLoading(true)
    setError(null)
    try {
      const data = await previewReport(type, filters)
      setPreview(data)
    } catch {
      setError('Erro ao carregar pré-visualização.')
    } finally {
      setLoading(false)
    }
  }

  function handleTypeChange(newType: ReportType) {
    setType(newType)
    setPreview(null)
    setFilters({})
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatórios Gerenciais</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gere e exporte relatórios de pedidos, gastos e operações
          </p>
        </div>
        <ReportExportButtons type={type} filters={filters} disabled={!preview} />
      </div>

      {/* Type selector */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Tipo de Relatório</h2>
        <ReportTypeSelector value={type} onChange={handleTypeChange} />
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Filtros</h2>
        <ReportFiltersForm type={type} filters={filters} onChange={setFilters} />
      </div>

      <Button onClick={handlePreview} disabled={loading}>
        {loading ? 'Carregando...' : 'Pré-visualizar'}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Preview table */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Pré-visualização</h2>
        <ReportPreviewTable preview={preview} isLoading={loading} />
      </div>
    </div>
  )
}
