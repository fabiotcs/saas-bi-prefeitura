'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { exportBIData } from '@/services/bi.service'
import type { BIPeriod, BIExportFormat } from '@/services/bi.service'

interface BIExportButtonsProps {
  period: BIPeriod
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function BIExportButtons({ period }: BIExportButtonsProps) {
  const [loading, setLoading] = useState<BIExportFormat | null>(null)

  async function handleExport(format: BIExportFormat) {
    setLoading(format)
    try {
      const blob = await exportBIData(period, format)
      const ext = format === 'PDF' ? 'pdf' : format === 'EXCEL' ? 'xlsx' : 'csv'
      downloadBlob(blob, `bi-report-${period.toLowerCase()}.${ext}`)
    } catch (err) {
      console.error('Erro ao exportar:', err)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('PDF')}
        disabled={loading !== null}
      >
        {loading === 'PDF' ? 'Exportando...' : 'Exportar PDF'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('EXCEL')}
        disabled={loading !== null}
      >
        {loading === 'EXCEL' ? 'Exportando...' : 'Exportar Excel'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('CSV')}
        disabled={loading !== null}
      >
        {loading === 'CSV' ? 'Exportando...' : 'Exportar CSV'}
      </Button>
    </div>
  )
}
