'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { listUsers } from '@/services/user.service'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useRequireRole } from '@/hooks/useRequireRole'
import type { UserRole } from '@prisma/client'

const ROLE_LABELS: Record<UserRole, string> = {
  MAIN_MANAGER: 'Gestor Principal',
  SECRETARY_MANAGER: 'Gestor de Secretaria',
  SECRETARY_USER: 'Usuário',
  AUDIT_VIEWER: 'Auditor',
}

const ROLE_VARIANT: Record<UserRole, string> = {
  MAIN_MANAGER: 'bg-purple-100 text-purple-800',
  SECRETARY_MANAGER: 'bg-blue-100 text-blue-800',
  SECRETARY_USER: 'bg-green-100 text-green-800',
  AUDIT_VIEWER: 'bg-gray-100 text-gray-700',
}

function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useCallback(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debouncedValue
}

export default function UsersPage() {
  useRequireRole(['MAIN_MANAGER', 'SECRETARY_MANAGER'], '/dashboard')

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search)

  const { data, isLoading } = useQuery({
    queryKey: ['users', { search: debouncedSearch, page }],
    queryFn: () => listUsers({ search: debouncedSearch, page, limit: 20 }),
  })

  const users = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <Button asChild>
          <Link href="/users/new">+ Novo Usuário</Link>
        </Button>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="max-w-xs"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Último Login</TableHead>
              <TableHead>Biometria</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {u.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.photoUrl} alt={u.fullName} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                        {u.fullName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{u.fullName}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_VARIANT[u.role]}`}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {u.lastLogin
                    ? new Date(u.lastLogin).toLocaleString('pt-BR')
                    : 'Nunca'}
                </TableCell>
                <TableCell>
                  <Badge variant={u.biometricVerified ? 'default' : 'secondary'}>
                    {u.biometricVerified ? '✓ Verificado' : 'Pendente'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/users/${u.id}/edit`}>Editar</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground self-center">
            Página {page} de {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Próximo
          </Button>
        </div>
      )}
    </div>
  )
}
