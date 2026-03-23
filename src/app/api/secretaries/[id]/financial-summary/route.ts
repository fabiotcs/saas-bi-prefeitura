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
      subSecretaries: { select: { budgetAllocated: true, budgetUsed: true } },
    },
  })

  if (!secretary) return NextResponse.json({ error: 'Secretaria não encontrada' }, { status: 404 })

  const distributedToSub = secretary.subSecretaries.reduce((sum: number, sub: { budgetAllocated: number }) => sum + sub.budgetAllocated, 0)

  return NextResponse.json({
    budgetAllocated: secretary.budgetAllocated,
    budgetUsed: secretary.budgetUsed,
    budgetByCommitment: secretary.budgetAllocated,
    usedInOrders: secretary.budgetUsed,
    distributedToSub,
    percentUsed: secretary.budgetAllocated > 0
      ? Math.round((secretary.budgetUsed / secretary.budgetAllocated) * 100)
      : 0,
  })
}
