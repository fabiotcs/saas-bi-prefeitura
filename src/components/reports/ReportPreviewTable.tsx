'use client'

import { useState } from 'react'
import type { ReportPreview } from '@/services/reports.service'

const PAGE_SIZE = 20

interface ReportPreviewTableProps {
  preview: ReportPreview | null
  isLoading: boolean
}

export function ReportPreviewTable({ preview, isLoading }: ReportPreviewTableProps) {
  const [page, setPage] = useState(1)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando pré-visualização...</p>
  }

  if (!preview) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">Selecione um tipo de relatório e clique em &quot;Pré-visualizar&quot;</p>
      </div>
    )
  }

  if (preview.rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum dado encontrado para os filtros aplicados.</p>
  }

  const totalPages = Math.ceil(preview.rows.length / PAGE_SIZE)
  const sliced = preview.rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{preview.rows.length} registro(s) encontrado(s)</p>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {preview.columns.map((col) => (
                <th key={col} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sliced.map((row, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                {preview.columns.map((col) => (
                  <td key={col} className="px-3 py-2 text-xs whitespace-nowrap">
                    {String(row[col] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-2 py-1 rounded border text-xs disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 rounded border text-xs disabled:opacity-40"
            >
              Próximo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
