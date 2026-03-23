'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRequireRole } from '@/hooks/useRequireRole'
import {
  listEstablishments,
  toggleFavorite,
} from '@/services/establishment.service'
import { EstablishmentCard } from '@/components/establishments/EstablishmentCard'
import { EstablishmentFilters } from '@/components/establishments/EstablishmentFilters'
import { EstablishmentForm } from '@/components/establishments/EstablishmentForm'
import { Button } from '@/components/ui/button'

const EstablishmentMap = dynamic(
  () => import('@/components/establishments/EstablishmentMap'),
  { ssr: false, loading: () => <div className="h-64 rounded-xl border bg-muted animate-pulse" /> },
)

export default function EstablishmentsPage() {
  useRequireRole(['MAIN_MANAGER', 'SECRETARY_MANAGER', 'SECRETARY_USER', 'AUDIT_VIEWER'], '/dashboard')

  const router = useRouter()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showMap, setShowMap] = useState(true)
  const [selectedMapId, setSelectedMapId] = useState<string | undefined>()

  const { data, isLoading } = useQuery({
    queryKey: ['establishments', search, city, state],
    queryFn: () => listEstablishments({ search, city, state }),
  })

  const favoriteMutation = useMutation({
    mutationFn: ({ id, current }: { id: string; current: boolean }) =>
      toggleFavorite(id, !current),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['establishments'] })
    },
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rede Credenciada</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Estabelecimentos homologados e fornecedores credenciados
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Novo Estabelecimento</Button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="text-base font-semibold">Cadastrar Estabelecimento</h2>
          <EstablishmentForm
            onSuccess={() => {
              setShowForm(false)
              void queryClient.invalidateQueries({ queryKey: ['establishments'] })
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Map toggle + Map */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Button
            variant={showMap ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowMap((v) => !v)}
          >
            {showMap ? '🗺 Ocultar Mapa' : '🗺 Ver Mapa'}
          </Button>
          {showMap && data?.data && (
            <span className="text-xs text-muted-foreground">
              {data.data.filter((e) => e.lat != null).length} de {data.data.length} no mapa
            </span>
          )}
        </div>
        {showMap && (
          <EstablishmentMap
            establishments={data?.data ?? []}
            selectedId={selectedMapId}
            onSelect={(id) => {
              setSelectedMapId(id)
              router.push(`/establishments/${id}`)
            }}
            height="360px"
          />
        )}
      </div>

      {/* Filters */}
      <EstablishmentFilters
        search={search}
        city={city}
        state={state}
        onSearchChange={setSearch}
        onCityChange={setCity}
        onStateChange={setState}
      />

      {/* Results */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : !data?.data.length ? (
        <p className="text-sm text-muted-foreground">Nenhum estabelecimento encontrado.</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {data.total} resultado{data.total !== 1 ? 's' : ''} encontrado{data.total !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.data.map((est) => (
              <EstablishmentCard
                key={est.id}
                establishment={est}
                onToggleFavorite={(id, current) =>
                  favoriteMutation.mutate({ id, current })
                }
                onView={(id) => router.push(`/establishments/${id}`)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
