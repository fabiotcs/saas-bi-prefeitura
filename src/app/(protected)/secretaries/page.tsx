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

export default function SecretariesPage() {
  useRequireRole(['MAIN_MANAGER', 'SECRETARY_MANAGER'], '/dashboard')

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['secretaries', { search, page }],
    queryFn: () => listSecretaries({ search, page, limit: 20 }),
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

      <Input
        placeholder="Buscar por nome ou responsável..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        className="max-w-sm"
      />

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : secretaries.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhuma secretaria encontrada.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {secretaries.map((s) => (
            <div key={s.id} className="rounded-xl border bg-card p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {s.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.photoUrl} alt={s.secretaryPersonName} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {s.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.secretaryPersonName}</p>
                  </div>
                </div>
                {s.parentId && (
                  <Badge variant="secondary" className="text-xs">Sub</Badge>
                )}
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>CNPJ: {s.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}</p>
                {s._count && <p>Pedidos: {s._count.orders}</p>}
                {s.subSecretaries && s.subSecretaries.length > 0 && (
                  <p>Subsecretarias: {s.subSecretaries.length}</p>
                )}
              </div>

              <BudgetProgressBar allocated={s.budgetAllocated} used={s.budgetUsed} />

              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <Link href={`/secretaries/${s.id}/edit`}>Editar</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="flex-1">
                  <Link href={`/secretaries/${s.id}/financial`}>Financeiro</Link>
                </Button>
              </div>
            </div>
          ))}
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
