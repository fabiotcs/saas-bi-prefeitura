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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const secretary = await prisma.secretary.findUnique({
    where: { id: params.id },
    include: {
      subSecretaries: { select: { id: true, name: true, budgetAllocated: true, budgetUsed: true } },
    },
  })

  if (!secretary) return NextResponse.json({ error: 'Secretaria não encontrada' }, { status: 404 })

  // 1. Valor destinado por empenho — soma dos BudgetCommitments ATIVOS
  const commitments = await prisma.budgetCommitment.findMany({
    where: { secretaryId: params.id, status: 'ACTIVE' },
    select: { value: true, usedValue: true },
  })
  const budgetByCommitment = commitments.reduce((sum, c) => sum + c.value, 0)
  const commitmentUsedValue = commitments.reduce((sum, c) => sum + c.usedValue, 0)

  // 2. Valor utilizado em pedidos — soma de invoices PAGAS desta secretaria
  const paidInvoices = await prisma.invoice.aggregate({
    where: { secretaryId: params.id, status: 'PAID' },
    _sum: { totalPaid: true },
  })
  const usedInOrders = paidInvoices._sum.totalPaid ?? 0

  // 3. Valor distribuído para subsecretárias — soma do budgetAllocated das subs
  const distributedToSub = secretary.subSecretaries.reduce((sum, sub) => sum + sub.budgetAllocated, 0)
  const subUsed = secretary.subSecretaries.reduce((sum, sub) => sum + sub.budgetUsed, 0)

  // 4. Saldo disponível
  const available = secretary.budgetAllocated - budgetByCommitment - distributedToSub

  return NextResponse.json({
    budgetAllocated: secretary.budgetAllocated,
    budgetUsed: secretary.budgetUsed,
    // Empenho
    budgetByCommitment,
    commitmentUsedValue,
    commitmentCount: commitments.length,
    // Pedidos
    usedInOrders,
    // Subsecretárias
    distributedToSub,
    subCount: secretary.subSecretaries.length,
    subUsed,
    subSecretaries: secretary.subSecretaries,
    // Saldo
    available: Math.max(available, 0),
    percentCommitted: secretary.budgetAllocated > 0
      ? Math.round((budgetByCommitment / secretary.budgetAllocated) * 100)
      : 0,
    percentUsed: secretary.budgetAllocated > 0
      ? Math.round((secretary.budgetUsed / secretary.budgetAllocated) * 100)
      : 0,
  })
}
