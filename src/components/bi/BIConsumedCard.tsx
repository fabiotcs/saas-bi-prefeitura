'use client'

interface BIConsumedCardProps {
  totalConsumed: number
  ordersInProgress: number
  ordersCancelledOrDisputed: number
  isLoading?: boolean
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function BIConsumedCard({
  totalConsumed,
  ordersInProgress,
  ordersCancelledOrDisputed,
  isLoading = false,
}: BIConsumedCardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="rounded-xl border bg-card p-5 space-y-2">
        <p className="text-sm text-muted-foreground">Total Consumido</p>
        <p className="text-2xl font-bold">
          {isLoading ? '—' : formatCurrency(totalConsumed)}
        </p>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-2">
        <p className="text-sm text-muted-foreground">Pedidos em Andamento</p>
        <p className="text-2xl font-bold text-blue-600">
          {isLoading ? '—' : ordersInProgress}
        </p>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-2">
        <p className="text-sm text-muted-foreground">Cancelados / Disputados</p>
        <p className="text-2xl font-bold text-red-600">
          {isLoading ? '—' : ordersCancelledOrDisputed}
        </p>
      </div>
    </div>
  )
}
