'use client'

import { useState } from 'react'
import { useBiometricHistory } from '@/hooks/useBiometricHistory'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { BiometricStatus, FraudAlertLevel } from '@prisma/client'

type StatusFilter = 'ALL' | BiometricStatus

function StatusBadge({ status }: { status: BiometricStatus }) {
  const variants: Record<BiometricStatus, string> = {
    SUCCESS: 'bg-green-100 text-green-800 border-green-200',
    FAILED: 'bg-red-100 text-red-800 border-red-200',
    SUSPICIOUS: 'bg-orange-100 text-orange-800 border-orange-200',
  }
  const labels: Record<BiometricStatus, string> = {
    SUCCESS: 'Sucesso',
    FAILED: 'Falha',
    SUSPICIOUS: 'Suspeito',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${variants[status]}`}
    >
      {labels[status]}
    </span>
  )
}

function FraudBadge({ level }: { level: FraudAlertLevel }) {
  const variants: Record<FraudAlertLevel, string> = {
    NONE: 'bg-gray-100 text-gray-700 border-gray-200',
    LOW: 'bg-blue-100 text-blue-800 border-blue-200',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    HIGH: 'bg-red-100 text-red-800 border-red-200',
  }
  const labels: Record<FraudAlertLevel, string> = {
    NONE: 'Nenhum',
    LOW: 'Baixo',
    MEDIUM: 'Médio',
    HIGH: 'Alto',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${variants[level]}`}
    >
      {labels[level]}
    </span>
  )
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value))
}

export default function BiometricHistoryPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const limit = 50

  const params = {
    ...(statusFilter !== 'ALL' && { status: statusFilter as BiometricStatus }),
    ...(from && { from }),
    ...(to && { to }),
    page,
    limit,
  }

  const { data, isLoading, isError } = useBiometricHistory(params)

  const totalPages = data ? Math.ceil(data.total / limit) : 1

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Histórico Biométrico</h1>
        <p className="text-sm text-gray-500 mt-1">
          Registro completo de autenticações biométricas do sistema
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Status</label>
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val as StatusFilter)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="SUCCESS">Sucesso</SelectItem>
              <SelectItem value="FAILED">Falha</SelectItem>
              <SelectItem value="SUSPICIOUS">Suspeito</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">De</label>
          <Input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value)
              setPage(1)
            }}
            className="w-44"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Até</label>
          <Input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value)
              setPage(1)
            }}
            className="w-44"
          />
        </div>

        {(statusFilter !== 'ALL' || from || to) && (
          <Button
            variant="outline"
            onClick={() => {
              setStatusFilter('ALL')
              setFrom('')
              setTo('')
              setPage(1)
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Tabela */}
      <div className="rounded-lg border bg-white overflow-hidden">
        {isLoading && (
          <div className="p-8 text-center text-sm text-gray-500">Carregando...</div>
        )}
        {isError && (
          <div className="p-8 text-center text-sm text-red-500">
            Erro ao carregar histórico biométrico.
          </div>
        )}
        {!isLoading && !isError && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Imagem</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Similaridade</TableHead>
                  <TableHead>Vivacidade</TableHead>
                  <TableHead>Alerta Fraude</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data/Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-gray-400 py-8">
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                )}
                {data?.data.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <img
                        src={record.capturedImageUrl}
                        alt="Imagem capturada"
                        width={48}
                        height={48}
                        className="rounded object-cover"
                        style={{ width: 48, height: 48, objectFit: 'cover' }}
                        onError={(e) => {
                          ;(e.currentTarget as HTMLImageElement).src =
                            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="%23e5e7eb" viewBox="0 0 24 24"%3E%3Cpath d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/%3E%3C/svg%3E'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {record.user.photoUrl && (
                          <img
                            src={record.user.photoUrl}
                            alt={record.user.fullName}
                            width={32}
                            height={32}
                            className="rounded-full object-cover"
                            style={{ width: 32, height: 32, objectFit: 'cover' }}
                          />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{record.user.fullName}</p>
                          <p className="text-xs text-gray-500">{record.user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {formatPercent(record.similarityScore)}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {formatPercent(record.livenessScore)}
                    </TableCell>
                    <TableCell>
                      <FraudBadge level={record.fraudAlertLevel} />
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 font-mono">
                      {record.ipAddress}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={record.status} />
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                      {formatDateTime(record.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Paginação */}
            {data && data.total > limit && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                <p className="text-xs text-gray-500">
                  Mostrando {(page - 1) * limit + 1}–{Math.min(page * limit, data.total)} de{' '}
                  {data.total} registros
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
