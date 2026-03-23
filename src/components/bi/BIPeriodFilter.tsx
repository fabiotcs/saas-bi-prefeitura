'use client'

import type { BIPeriod } from '@/services/bi.service'

interface BIPeriodFilterProps {
  value: BIPeriod
  onChange: (period: BIPeriod) => void
}

const PERIOD_OPTIONS: { value: BIPeriod; label: string }[] = [
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'MONTHLY', label: 'Mensal' },
  { value: 'QUARTERLY', label: 'Trimestral' },
  { value: 'YEARLY', label: 'Anual' },
]

export function BIPeriodFilter({ value, onChange }: BIPeriodFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="bi-period-select" className="text-sm font-medium text-muted-foreground">
        Período:
      </label>
      <select
        id="bi-period-select"
        value={value}
        onChange={(e) => onChange(e.target.value as BIPeriod)}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {PERIOD_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
