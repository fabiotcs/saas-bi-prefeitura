import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'

async function getAuthenticatedUser(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  try {
    const payload = await verifyToken(token)
    if (payload.type !== 'access') return null
    return await prisma.user.findUnique({ where: { id: payload.userId } })
  } catch {
    return null
  }
}

function getPeriodDates(period: string): { from: Date; to: Date } {
  const to = new Date()
  const from = new Date()
  switch (period) {
    case 'WEEKLY': from.setDate(from.getDate() - 7); break
    case 'MONTHLY': from.setMonth(from.getMonth() - 1); break
    case 'QUARTERLY': from.setMonth(from.getMonth() - 3); break
    case 'YEARLY': from.setFullYear(from.getFullYear() - 1); break
    default: from.setMonth(from.getMonth() - 1)
  }
  return { from, to }
}

export interface BIData {
  period: string
  totalConsumed: number
  ordersInProgress: number
  ordersCancelledOrDisputed: number
  dailyAcceptedBudgets: { date: string; count: number; value: number }[]
  ordersByStatus: { status: string; count: number }[]
  consumptionBySecretary: { secretary: string; value: number }[]
  topItems: { name: string; occurrences: number; totalValue: number }[]
}

export async function GET(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const period = request.nextUrl.searchParams.get('period') ?? 'MONTHLY'
  const { from, to } = getPeriodDates(period)

  // Total consumed — sum of InvoiceItem.unitPrice * quantity within period
  const invoiceItems = await prisma.invoiceItem.findMany({
    where: {
      invoice: { createdAt: { gte: from, lte: to } },
    },
    select: { quantity: true, unitPrice: true },
  })
  const totalConsumed = invoiceItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)

  // Orders in progress (OPEN | IN_QUOTATION | APPROVED)
  const ordersInProgress = await prisma.order.count({
    where: {
      createdAt: { gte: from, lte: to },
      status: { in: ['OPEN', 'IN_QUOTATION', 'APPROVED'] },
    },
  })

  // Orders cancelled or disputed (CANCELLED + NonConformity)
  const ordersCancelled = await prisma.order.count({
    where: {
      createdAt: { gte: from, lte: to },
      status: 'CANCELLED',
    },
  })
  const ordersDisputed = await prisma.order.count({
    where: {
      createdAt: { gte: from, lte: to },
      nonConformities: { some: {} },
    },
  })
  const ordersCancelledOrDisputed = ordersCancelled + ordersDisputed

  // Daily accepted budgets (APPROVED orders per day)
  const approvedOrders = await prisma.order.findMany({
    where: {
      status: 'APPROVED',
      createdAt: { gte: from, lte: to },
    },
    select: { createdAt: true, items: { select: { referenceValue: true, quantity: true } } },
  })

  const dailyMap = new Map<string, { count: number; value: number }>()
  for (const order of approvedOrders) {
    const dateKey = order.createdAt.toISOString().slice(0, 10)
    const orderValue = order.items.reduce((sum, i) => sum + i.referenceValue * i.quantity, 0)
    const existing = dailyMap.get(dateKey) ?? { count: 0, value: 0 }
    dailyMap.set(dateKey, { count: existing.count + 1, value: existing.value + orderValue })
  }
  const dailyAcceptedBudgets = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, count: v.count, value: v.value }))

  // Orders by status
  const allOrderStatuses = ['DRAFT', 'OPEN', 'IN_QUOTATION', 'APPROVED', 'DELIVERED', 'COMPLETED', 'CANCELLED']
  const orderCountsByStatus = await prisma.order.groupBy({
    by: ['status'],
    where: { createdAt: { gte: from, lte: to } },
    _count: { _all: true },
  })
  const statusMap = new Map(orderCountsByStatus.map(r => [r.status, r._count._all]))
  const ordersByStatus = allOrderStatuses.map(status => ({
    status,
    count: statusMap.get(status as Parameters<typeof statusMap.get>[0]) ?? 0,
  }))

  // Consumption by secretary — using invoices
  const invoicesWithSecretary = await prisma.invoice.findMany({
    where: { createdAt: { gte: from, lte: to } },
    select: {
      totalBilled: true,
      secretary: { select: { name: true } },
    },
  })
  const secretaryMap = new Map<string, number>()
  for (const inv of invoicesWithSecretary) {
    const name = inv.secretary.name
    secretaryMap.set(name, (secretaryMap.get(name) ?? 0) + inv.totalBilled)
  }
  const consumptionBySecretary = Array.from(secretaryMap.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([secretary, value]) => ({ secretary, value }))

  // Top items — from InvoiceItem
  const allInvoiceItems = await prisma.invoiceItem.findMany({
    where: {
      invoice: { createdAt: { gte: from, lte: to } },
    },
    select: { itemName: true, quantity: true, unitPrice: true, total: true },
  })
  const topItemsMap = new Map<string, { occurrences: number; totalValue: number }>()
  for (const item of allInvoiceItems) {
    const existing = topItemsMap.get(item.itemName) ?? { occurrences: 0, totalValue: 0 }
    topItemsMap.set(item.itemName, {
      occurrences: existing.occurrences + 1,
      totalValue: existing.totalValue + item.total,
    })
  }
  const topItems = Array.from(topItemsMap.entries())
    .sort(([, a], [, b]) => b.totalValue - a.totalValue)
    .slice(0, 10)
    .map(([name, v]) => ({ name, occurrences: v.occurrences, totalValue: v.totalValue }))

  const biData: BIData = {
    period,
    totalConsumed,
    ordersInProgress,
    ordersCancelledOrDisputed,
    dailyAcceptedBudgets,
    ordersByStatus,
    consumptionBySecretary,
    topItems,
  }

  return NextResponse.json(biData)
}
