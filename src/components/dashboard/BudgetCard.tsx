'use client'

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface BudgetCardProps {
  budgetTotal: number
  budgetUsed: number
  budgetRemaining: number
}

export function BudgetCard({ budgetTotal, budgetUsed, budgetRemaining }: BudgetCardProps) {
  const percentUsed = budgetTotal > 0 ? (budgetUsed / budgetTotal) * 100 : 0

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Orçamento Global</h2>
        <span className="text-xs text-muted-foreground">{percentUsed.toFixed(1)}% utilizado</span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-medium">{formatCurrency(budgetTotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Utilizado</span>
          <span className="font-medium text-red-600">{formatCurrency(budgetUsed)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Disponível</span>
          <span className={`font-semibold ${budgetRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(budgetRemaining)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${percentUsed >= 90 ? 'bg-red-500' : percentUsed >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>
    </div>
  )
}
