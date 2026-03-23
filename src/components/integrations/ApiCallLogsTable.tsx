'use client'

import type { ApiCallLog } from '@/services/integrations.service'

interface ApiCallLogsTableProps {
  logs: ApiCallLog[]
  isLoading: boolean
}

function StatusCodeBadge({ code }: { code: number }) {
  const cls =
    code >= 200 && code < 300
      ? 'bg-green-100 text-green-700'
      : code >= 400
      ? 'bg-red-100 text-red-700'
      : 'bg-yellow-100 text-yellow-700'
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ${cls}`}>
      {code}
    </span>
  )
}

export function ApiCallLogsTable({ logs, isLoading }: ApiCallLogsTableProps) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando logs...</p>
  }

  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum log encontrado.</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Endpoint</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Método</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Status</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Tempo</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">IP</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Data</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-3 py-2 text-xs font-mono">{log.endpoint}</td>
              <td className="px-3 py-2 text-xs font-medium">{log.method}</td>
              <td className="px-3 py-2">
                <StatusCodeBadge code={log.statusCode} />
              </td>
              <td className="px-3 py-2 text-xs">{log.responseTimeMs}ms</td>
              <td className="px-3 py-2 text-xs text-muted-foreground font-mono">{log.ipAddress}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                {new Date(log.occurredAt).toLocaleString('pt-BR')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
