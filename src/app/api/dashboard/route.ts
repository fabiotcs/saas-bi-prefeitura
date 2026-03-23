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

export async function GET(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Budget aggregation from BudgetContract
  const contracts = await prisma.budgetContract.findMany({
    select: { initialValue: true, currentTotal: true, consumedInOrders: true },
  })

  const budgetTotal = contracts.reduce((sum, c) => sum + c.currentTotal, 0)
  const budgetUsed = contracts.reduce((sum, c) => sum + c.consumedInOrders, 0)
  const budgetRemaining = budgetTotal - budgetUsed

  // Secretary list with budget info
  const secretaries = await prisma.secretary.findMany({
    select: {
      id: true,
      name: true,
      budgetAllocated: true,
      budgetUsed: true,
    },
    orderBy: { name: 'asc' },
  })

  const secretaryList = secretaries.map((s) => ({
    id: s.id,
    name: s.name,
    budgetAllocated: s.budgetAllocated,
    budgetUsed: s.budgetUsed,
    budgetRemaining: s.budgetAllocated - s.budgetUsed,
    percentUsed: s.budgetAllocated > 0 ? (s.budgetUsed / s.budgetAllocated) * 100 : 0,
  }))

  // Orders summary by status
  const [
    openCount,
    inProgressCount,
    pendingApprovalCount,
    finishedCount,
    cancelledCount,
  ] = await Promise.all([
    prisma.order.count({ where: { status: 'OPEN' } }),
    prisma.order.count({ where: { status: 'IN_QUOTATION' } }),
    prisma.order.count({ where: { status: 'APPROVED' } }),
    prisma.order.count({ where: { status: { in: ['DELIVERED', 'COMPLETED'] } } }),
    prisma.order.count({ where: { status: 'CANCELLED' } }),
  ])

  const ordersSummary = {
    open: openCount,
    inProgress: inProgressCount,
    pendingApproval: pendingApprovalCount,
    finished: finishedCount,
    cancelled: cancelledCount,
  }

  // Recent orders (last 10)
  const recentOrdersRaw = await prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      createdAt: true,
      secretary: { select: { id: true, name: true } },
    },
  })

  const recentOrders = recentOrdersRaw.map((o) => ({
    id: o.id,
    code: o.code,
    name: o.name,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    secretaryId: o.secretary.id,
    secretaryName: o.secretary.name,
  }))

  return NextResponse.json({
    budgetTotal,
    budgetUsed,
    budgetRemaining,
    secretaryList,
    ordersSummary,
    recentOrders,
  })
}
