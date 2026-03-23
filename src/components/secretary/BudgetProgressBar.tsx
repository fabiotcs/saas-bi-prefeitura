'use client'

interface BudgetProgressBarProps {
  allocated: number
  used: number
  showValues?: boolean
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function BudgetProgressBar({ allocated, used, showValues = true }: BudgetProgressBarProps) {
  const percent = allocated > 0 ? Math.min(Math.round((used / allocated) * 100), 100) : 0

  const color =
    percent >= 90 ? 'bg-red-500' :
    percent >= 70 ? 'bg-yellow-500' :
    'bg-green-500'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{percent}% utilizado</span>
        {showValues && <span>{formatBRL(used)} / {formatBRL(allocated)}</span>}
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
