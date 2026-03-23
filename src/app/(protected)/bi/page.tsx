'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRequireRole } from '@/hooks/useRequireRole'
import { getBIData } from '@/services/bi.service'
import type { BIPeriod } from '@/services/bi.service'
import { BIPeriodFilter } from '@/components/bi/BIPeriodFilter'
import { BIConsumedCard } from '@/components/bi/BIConsumedCard'
import { BIDailyBudgetsChart } from '@/components/bi/BIDailyBudgetsChart'
import { BIOrdersByStatusChart } from '@/components/bi/BIOrdersByStatusChart'
import { BIConsumptionBySecretaryChart } from '@/components/bi/BIConsumptionBySecretaryChart'
import { BITopItemsTable } from '@/components/bi/BITopItemsTable'
import { BIExportButtons } from '@/components/bi/BIExportButtons'

export default function BIPage() {
  useRequireRole(['MAIN_MANAGER', 'SECRETARY_MANAGER', 'AUDIT_VIEWER'], '/dashboard')

  const [period, setPeriod] = useState<BIPeriod>('MONTHLY')

  const { data, isLoading } = useQuery({
    queryKey: ['bi-data', period],
    queryFn: () => getBIData(period),
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Business Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Análise de consumo, pedidos e gastos por período
          </p>
        </div>
        <BIExportButtons period={period} />
      </div>

      {/* Period Filter */}
      <BIPeriodFilter value={period} onChange={setPeriod} />

      {/* KPI Cards */}
      <BIConsumedCard
        totalConsumed={data?.totalConsumed ?? 0}
        ordersInProgress={data?.ordersInProgress ?? 0}
        ordersCancelledOrDisputed={data?.ordersCancelledOrDisputed ?? 0}
        isLoading={isLoading}
      />

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BIDailyBudgetsChart
          data={data?.dailyAcceptedBudgets ?? []}
          isLoading={isLoading}
        />
        <BIOrdersByStatusChart
          data={data?.ordersByStatus ?? []}
          isLoading={isLoading}
        />
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BIConsumptionBySecretaryChart
          data={data?.consumptionBySecretary ?? []}
          isLoading={isLoading}
        />
        <BITopItemsTable
          data={data?.topItems ?? []}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
