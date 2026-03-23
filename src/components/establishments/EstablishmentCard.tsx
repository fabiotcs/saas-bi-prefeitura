'use client'

import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Establishment, EstablishmentStatus } from '@/services/establishment.service'

interface EstablishmentCardProps {
  establishment: Establishment
  onToggleFavorite?: (id: string, current: boolean) => void
  onView?: (id: string) => void
}

function StatusBadge({ status }: { status: EstablishmentStatus }) {
  const styles: Record<EstablishmentStatus, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-gray-100 text-gray-600',
    SUSPENDED: 'bg-red-100 text-red-700',
  }
  const labels: Record<EstablishmentStatus, string> = {
    ACTIVE: 'Ativo',
    INACTIVE: 'Inativo',
    SUSPENDED: 'Suspenso',
  }
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${star <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">({rating.toFixed(1)})</span>
    </div>
  )
}

function formatCnpj(cnpj: string) {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return cnpj
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

export function EstablishmentCard({ establishment, onToggleFavorite, onView }: EstablishmentCardProps) {
  const { id, name, cnpj, city, state, rating, status, isFavorite } = establishment

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm line-clamp-2 leading-tight">{name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{formatCnpj(cnpj)}</p>
        </div>
        <button
          type="button"
          aria-label={isFavorite ? 'Remover favorito' : 'Adicionar favorito'}
          onClick={() => onToggleFavorite?.(id, isFavorite)}
          className="flex-shrink-0 p-1 rounded hover:bg-muted transition-colors"
        >
          <Star
            className={`h-4 w-4 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        </button>
      </div>

      {/* Location */}
      <p className="text-xs text-muted-foreground">
        {city}, {state}
      </p>

      {/* Rating */}
      <RatingStars rating={rating} />

      {/* Status badge */}
      <StatusBadge status={status} />

      {/* Action */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => onView?.(id)}
      >
        Ver Detalhes
      </Button>
    </div>
  )
}
