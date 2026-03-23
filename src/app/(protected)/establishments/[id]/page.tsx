'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRequireRole } from '@/hooks/useRequireRole'
import { getEstablishmentById, toggleFavorite } from '@/services/establishment.service'
import { Button } from '@/components/ui/button'
import { Star } from 'lucide-react'

function formatCnpj(cnpj: string) {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return cnpj
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  SUSPENDED: 'Suspenso',
}

export default function EstablishmentDetailPage() {
  useRequireRole(['MAIN_MANAGER', 'SECRETARY_MANAGER', 'SECRETARY_USER', 'AUDIT_VIEWER'], '/dashboard')

  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['establishment', id],
    queryFn: () => getEstablishmentById(id),
    enabled: !!id,
  })

  const favoriteMutation = useMutation({
    mutationFn: () => toggleFavorite(id, !data?.isFavorite),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['establishment', id] })
      void queryClient.invalidateQueries({ queryKey: ['establishments'] })
    },
  })

  if (isLoading) {
    return <div className="p-6"><p className="text-sm text-muted-foreground">Carregando...</p></div>
  }

  if (isError || !data) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-sm text-destructive">Estabelecimento não encontrado.</p>
        <Button variant="outline" onClick={() => router.back()}>Voltar</Button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <p className="text-sm text-muted-foreground">{formatCnpj(data.cnpj)}</p>
        </div>
        <button
          type="button"
          aria-label={data.isFavorite ? 'Remover favorito' : 'Adicionar favorito'}
          onClick={() => favoriteMutation.mutate()}
          className="p-2 rounded hover:bg-muted transition-colors"
        >
          <Star
            className={`h-5 w-5 ${data.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        </button>
      </div>

      {/* Details */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Endereço</p>
            <p className="font-medium">{data.address}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cidade/Estado</p>
            <p className="font-medium">{data.city}, {data.state}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Telefone</p>
            <p className="font-medium">{data.phone}</p>
          </div>
          {data.email && (
            <div>
              <p className="text-xs text-muted-foreground">E-mail</p>
              <p className="font-medium">{data.email}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="font-medium">{STATUS_LABELS[data.status] ?? data.status}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pedidos Concluídos</p>
            <p className="font-medium">{data.ordersCompleted}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avaliação</p>
            <p className="font-medium">{data.rating.toFixed(1)} / 5.0</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Serviços</p>
          <p className="text-sm mt-0.5">{data.servicesDescription}</p>
        </div>
      </div>

      <Button variant="outline" onClick={() => router.back()}>Voltar</Button>
    </div>
  )
}
