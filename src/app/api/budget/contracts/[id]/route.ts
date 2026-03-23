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
  if (!authUser) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const contract = await prisma.budgetContract.findUnique({
    where: { id: params.id },
    include: {
      additives: {
        include: {
          approvedBy: { select: { id: true, fullName: true } },
        },
        orderBy: { approvedAt: 'desc' },
      },
      commitments: {
        include: {
          secretary: { select: { id: true, name: true } },
          registeredBy: { select: { id: true, fullName: true } },
        },
        orderBy: { registeredAt: 'desc' },
      },
    },
  })

  if (!contract) {
    return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
  }

  return NextResponse.json(contract)
}
