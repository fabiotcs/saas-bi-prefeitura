'use client'

import { useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'

interface EstablishmentFiltersProps {
  search: string
  city: string
  state: string
  onSearchChange: (value: string) => void
  onCityChange: (value: string) => void
  onStateChange: (value: string) => void
}

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

export function EstablishmentFilters({
  search,
  city,
  state,
  onSearchChange,
  onCityChange,
  onStateChange,
}: EstablishmentFiltersProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSearchInput(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onSearchChange(value)
    }, 300)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Input
        placeholder="Buscar por nome..."
        defaultValue={search}
        onChange={(e) => handleSearchInput(e.target.value)}
        className="max-w-xs"
      />
      <Input
        placeholder="Cidade..."
        value={city}
        onChange={(e) => onCityChange(e.target.value)}
        className="max-w-xs"
      />
      <select
        value={state}
        onChange={(e) => onStateChange(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">Todos os estados</option>
        {BRAZILIAN_STATES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  )
}
