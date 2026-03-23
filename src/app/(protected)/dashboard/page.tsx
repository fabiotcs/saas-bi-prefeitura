'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchDashboard } from '@/services/dashboard.service'
import { BudgetCard } from '@/components/dashboard/BudgetCard'
import { SecretaryProgressList } from '@/components/dashboard/SecretaryProgressList'
import { OrderStatusChart } from '@/components/dashboard/OrderStatusChart'
import { RecentOrdersTable } from '@/components/dashboard/RecentOrdersTable'
import { QuickActionButtons } from '@/components/dashboard/QuickActionButtons'

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  })

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground text-sm">Carregando dashboard...</p>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <p className="text-red-500 text-sm">Erro ao carregar dados do dashboard.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visão geral dos indicadores do município
          </p>
        </div>
        <QuickActionButtons />
      </div>

      {/* Budget Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <BudgetCard
            budgetTotal={data.budgetTotal}
            budgetUsed={data.budgetUsed}
            budgetRemaining={data.budgetRemaining}
          />
        </div>

        {/* Orders summary mini cards */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Em Aberto</p>
            <p className="text-2xl font-bold text-blue-600">{data.ordersSummary.open}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Em Cotação</p>
            <p className="text-2xl font-bold text-yellow-600">{data.ordersSummary.inProgress}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Aguard. Aprovação</p>
            <p className="text-2xl font-bold text-purple-600">{data.ordersSummary.pendingApproval}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Concluídas</p>
            <p className="text-2xl font-bold text-green-600">{data.ordersSummary.finished}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Canceladas</p>
            <p className="text-2xl font-bold text-red-600">{data.ordersSummary.cancelled}</p>
          </div>
        </div>
      </div>

      {/* Charts and Secretary List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OrderStatusChart ordersSummary={data.ordersSummary} />
        <SecretaryProgressList secretaryList={data.secretaryList} />
      </div>

      {/* Recent Orders */}
      <RecentOrdersTable recentOrders={data.recentOrders} />
    </div>
  )
}
