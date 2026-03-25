'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { listSecretaries } from '@/services/secretary.service'
import { BudgetProgressBar } from '@/components/secretary/BudgetProgressBar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRequireRole } from '@/hooks/useRequireRole'

const ROLE_LABELS: Record<string, string> = {
  MAIN_MANAGER: 'Gestor Principal',
  SECRETARY_MANAGER: 'Gestor',
  SECRETARY_USER: 'Usuário',
  AUDIT_VIEWER: 'Auditor',
}

export default function SecretariesPage() {
  useRequireRole(['MAIN_MANAGER', 'SECRETARY_MANAGER'], '/dashboard')

  const [search, setSearch] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [page, setPage] = useState(1)

  function handleFilter() {
    setActiveSearch(search)
    setPage(1)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['secretaries', { search: activeSearch, page }],
    queryFn: () => listSecretaries({ search: activeSearch, page, limit: 20 }),
  })

  const secretaries = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Secretarias</h1>
        <Button asChild>
          <Link href="/secretaries/new">+ Nova Secretaria</Link>
        </Button>
      </div>

      {/* Filtro com botão explícito */}
      <div className="flex gap-2 max-w-sm">
        <Input
          placeholder="Buscar pelo nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleFilter() }}
        />
        <Button variant="outline" onClick={handleFilter}>
          Filtrar
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : secretaries.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhuma secretaria encontrada.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {secretaries.map((s) => {
            const users = (s as unknown as { users?: { id: string; fullName: string; photoUrl?: string | null; role: string }[] }).users ?? []

            return (
              <div key={s.id} className="rounded-xl border bg-card p-5 space-y-4">
                {/* Header: nome + badge Sub */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm leading-tight">{s.name}</p>
                    {s.parentId && (
                      <Badge variant="secondary" className="text-xs mt-1">Subsecretaria</Badge>
                    )}
                  </div>
                </div>

                {/* Responsáveis */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Responsáveis ({users.length > 0 ? users.length : '—'})
                  </p>
                  {users.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {users.slice(0, 4).map((u) => (
                        <div key={u.id} className="flex items-center gap-1.5">
                          {u.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={u.photoUrl}
                              alt={u.fullName}
                              className="w-7 h-7 rounded-full object-cover border"
                              title={u.fullName}
                            />
                          ) : (
                            <div
                              className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary border"
                              title={u.fullName}
                            >
                              {u.fullName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="leading-tight">
                            <p className="text-xs font-medium truncate max-w-[100px]">{u.fullName}</p>
                            <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[u.role] ?? u.role}</p>
                          </div>
                        </div>
                      ))}
                      {users.length > 4 && (
                        <span className="text-xs text-muted-foreground self-center">+{users.length - 4}</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                        {s.secretaryPersonName.charAt(0)}
                      </div>
                      <span className="text-xs text-muted-foreground">{s.secretaryPersonName}</span>
                    </div>
                  )}
                </div>

                {/* Subsecretárias e pedidos */}
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>
                    <span className="font-semibold text-foreground">
                      {s.subSecretaries?.length ?? 0}
                    </span>{' '}subsecretária{(s.subSecretaries?.length ?? 0) !== 1 ? 's' : ''}
                  </span>
                  <span>
                    <span className="font-semibold text-foreground">
                      {s._count?.orders ?? 0}
                    </span>{' '}pedido{(s._count?.orders ?? 0) !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Barra orçamentária */}
                <BudgetProgressBar allocated={s.budgetAllocated} used={s.budgetUsed} />

                {/* Ações */}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link href={`/secretaries/${s.id}/edit`}>Editar</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild className="flex-1">
                    <Link href={`/secretaries/${s.id}/financial`}>Financeiro</Link>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground self-center">Página {page} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Próximo</Button>
        </div>
      )}
    </div>
  )
}
