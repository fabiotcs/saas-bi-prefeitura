'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRequireRole } from '@/hooks/useRequireRole'
import { api } from '@/lib/api'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AuditStatus } from '@prisma/client'

interface AuditLogEntry {
  id: string
  action: string
  urlPath: string
  ipAddress: string
  status: AuditStatus
  occurredAt: string
  user: { id: string; fullName: string; photoUrl: string | null; email: string } | null
}

async function fetchAuditLogs(params: {
  status?: AuditStatus | ''
  from?: string
  to?: string
  userId?: string
  page?: number
  limit?: number
}) {
  const query = new URLSearchParams()
  if (params.status) query.set('status', params.status)
  if (params.from) query.set('from', params.from)
  if (params.to) query.set('to', params.to)
  if (params.userId) query.set('userId', params.userId)
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))

  const { data } = await api.get<{ data: AuditLogEntry[]; total: number; page: number; limit: number }>(
    `/api/audit/logs?${query.toString()}`
  )
  return data
}

const STATUS_LABELS: Record<AuditStatus, string> = {
  SUCCESS: 'Sucesso',
  FAILED: 'Falha',
  SUSPICIOUS: 'Suspeito',
}

const STATUS_BADGE: Record<AuditStatus, string> = {
  SUCCESS: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  SUSPICIOUS: 'bg-yellow-100 text-yellow-800',
}

export default function AuditLogsPage() {
  useRequireRole(['MAIN_MANAGER', 'AUDIT_VIEWER', 'SECRETARY_MANAGER'], '/dashboard')

  const [statusFilter, setStatusFilter] = useState<AuditStatus | ''>('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [userIdFilter, setUserIdFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', { statusFilter, fromDate, toDate, userIdFilter, page }],
    queryFn: () =>
      fetchAuditLogs({
        status: statusFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        userId: userIdFilter || undefined,
        page,
        limit: 20,
      }),
  })

  const logs = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  function handleFilterChange() {
    setPage(1)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Logs de Auditoria</h1>
        <span className="text-sm text-muted-foreground">{total} registro(s)</span>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          className="border rounded-md px-3 py-2 text-sm bg-white"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as AuditStatus | '')
            handleFilterChange()
          }}
        >
          <option value="">Todos os status</option>
          <option value="SUCCESS">Sucesso</option>
          <option value="FAILED">Falha</option>
          <option value="SUSPICIOUS">Suspeito</option>
        </select>

        <Input
          type="date"
          placeholder="De"
          value={fromDate}
          onChange={(e) => { setFromDate(e.target.value); handleFilterChange() }}
          className="max-w-[160px]"
        />

        <Input
          type="date"
          placeholder="Até"
          value={toDate}
          onChange={(e) => { setToDate(e.target.value); handleFilterChange() }}
          className="max-w-[160px]"
        />

        <Input
          placeholder="Buscar por ID do usuário..."
          value={userIdFilter}
          onChange={(e) => { setUserIdFilter(e.target.value); handleFilterChange() }}
          className="max-w-xs"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data/Hora</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum log encontrado.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {log.user?.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={log.user.photoUrl}
                          alt={log.user.fullName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {log.user?.fullName?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">{log.user?.fullName ?? 'Sistema'}</p>
                        <p className="text-xs text-muted-foreground">{log.user?.email ?? ''}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{log.action}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {log.urlPath}
                  </TableCell>
                  <TableCell className="text-sm font-mono">{log.ipAddress}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[log.status]}`}
                    >
                      {STATUS_LABELS[log.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(log.occurredAt).toLocaleString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground self-center">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próximo
          </Button>
        </div>
      )}
    </div>
  )
}
