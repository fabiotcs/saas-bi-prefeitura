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
      <div className="space-y-4">
        {secretaryList.map((s) => (
          <div key={s.id} className="space-y-1.5">
            {/* Nome + saldo total */}
            <div className="flex justify-between text-sm">
              <span className="font-medium truncate max-w-[55%]">{s.name}</span>
              <span className="text-muted-foreground text-xs">
                {formatCurrency(s.budgetAllocated)}
              </span>
            </div>

            {/* Barra dupla: empenhado + utilizado */}
            <div className="relative w-full bg-gray-200 rounded-full h-3">
              {/* Empenhado (fundo) */}
              <div
                className="absolute left-0 top-0 h-3 rounded-full bg-yellow-400 transition-all"
                style={{ width: `${Math.min(s.percentCommitted, 100)}%` }}
              />
              {/* Utilizado (frente) */}
              <div
                className={`absolute left-0 top-0 h-3 rounded-full transition-all ${
                  s.percentUsed >= 90 ? 'bg-red-500' : s.percentUsed >= 70 ? 'bg-orange-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(s.percentUsed, 100)}%` }}
              />
            </div>

            {/* Legenda empenhado / utilizado / disponível */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-400" />
                Empenhado: <strong className="text-foreground">{formatCurrency(s.budgetCommitted)}</strong>
              </span>
              <span className="flex items-center gap-1">
                <span className={`inline-block w-2.5 h-2.5 rounded-sm ${s.percentUsed >= 90 ? 'bg-red-500' : s.percentUsed >= 70 ? 'bg-orange-500' : 'bg-green-500'}`} />
                Utilizado: <strong className="text-foreground">{formatCurrency(s.budgetUsed)}</strong>
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-gray-300" />
                Disponível: <strong className={s.budgetRemaining >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(s.budgetRemaining)}</strong>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Legenda das cores */}
      <div className="border-t pt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" /> &lt;70% utilizado</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" /> 70–90%</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> &gt;90% crítico</span>
      </div>
    </div>
  )
}
