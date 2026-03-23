'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { generateReport } from '@/services/reports.service'
import type { ReportType, ReportFilters, ReportFormat } from '@/services/reports.service'

interface ReportExportButtonsProps {
  type: ReportType
  filters: ReportFilters
  disabled?: boolean
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportExportButtons({ type, filters, disabled }: ReportExportButtonsProps) {
  const [loading, setLoading] = useState<ReportFormat | null>(null)

  async function handleExport(format: ReportFormat) {
    setLoading(format)
    try {
      const blob = await generateReport(type, filters, format)
      const ext = format === 'PDF' ? 'pdf' : format === 'EXCEL' ? 'xlsx' : 'csv'
      downloadBlob(blob, `report-${type.toLowerCase()}.${ext}`)
    } catch {
      // Silently ignore export errors in UI
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || loading !== null}
        onClick={() => handleExport('CSV')}
      >
        {loading === 'CSV' ? 'Exportando...' : 'Exportar CSV'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || loading !== null}
        onClick={() => handleExport('EXCEL')}
      >
        {loading === 'EXCEL' ? 'Exportando...' : 'Exportar Excel'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || loading !== null}
        onClick={() => handleExport('PDF')}
      >
        {loading === 'PDF' ? 'Exportando...' : 'Exportar PDF'}
      </Button>
    </div>
  )
}
