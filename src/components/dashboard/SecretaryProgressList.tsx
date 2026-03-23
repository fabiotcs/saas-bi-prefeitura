'use client'

import type { SecretaryBudget } from '@/services/dashboard.service'

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface SecretaryProgressListProps {
  secretaryList: SecretaryBudget[]
}

export function SecretaryProgressList({ secretaryList }: SecretaryProgressListProps) {
  if (secretaryList.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-base font-semibold mb-3">Orçamento por Secretaria</h2>
        <p className="text-sm text-muted-foreground">Nenhuma secretaria cadastrada.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <h2 className="text-base font-semibold">Orçamento por Secretaria</h2>
      <div className="space-y-3">
        {secretaryList.map((s) => (
          <div key={s.id} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium truncate max-w-[60%]">{s.name}</span>
              <span className="text-muted-foreground text-xs">
                {formatCurrency(s.budgetUsed)} / {formatCurrency(s.budgetAllocated)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    s.percentUsed >= 90 ? 'bg-red-500' : s.percentUsed >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(s.percentUsed, 100)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-10 text-right">
                {s.percentUsed.toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
