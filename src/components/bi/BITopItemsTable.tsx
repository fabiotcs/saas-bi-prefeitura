'use client'

import type { BITopItem } from '@/services/bi.service'

interface BITopItemsTableProps {
  data: BITopItem[]
  isLoading?: boolean
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function BITopItemsTable({ data, isLoading = false }: BITopItemsTableProps) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="p-5 border-b">
        <h3 className="font-semibold text-sm">Top Itens do Período</h3>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground text-sm p-5">Carregando...</p>
      ) : data.length === 0 ? (
        <p className="text-muted-foreground text-sm p-5">Nenhum item no período selecionado.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">#</th>
              <th className="text-left p-3 font-medium">Nome</th>
              <th className="text-right p-3 font-medium">Ocorrências</th>
              <th className="text-right p-3 font-medium">Valor Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={item.name} className="border-t hover:bg-muted/30 transition-colors">
                <td className="p-3 text-muted-foreground">{index + 1}</td>
                <td className="p-3 font-medium">{item.name}</td>
                <td className="p-3 text-right">{item.occurrences}</td>
                <td className="p-3 text-right font-medium">{formatCurrency(item.totalValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
