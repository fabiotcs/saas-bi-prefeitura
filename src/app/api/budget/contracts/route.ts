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

const ALLOWED_ROLES = ['MAIN_MANAGER', 'SECRETARY_MANAGER', 'AUDIT_VIEWER'] as const

export async function GET(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (!ALLOWED_ROLES.includes(authUser.role as typeof ALLOWED_ROLES[number])) {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const contracts = await prisma.budgetContract.findMany({
    include: {
      _count: { select: { additives: true, commitments: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ data: contracts })
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (authUser.role !== 'MAIN_MANAGER') {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  let body: { contractNumber?: string; initialValue?: number }
  try {
    body = (await request.json()) as { contractNumber?: string; initialValue?: number }
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 })
  }

  const { contractNumber, initialValue } = body

  if (!contractNumber || initialValue === undefined || initialValue === null) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: contractNumber, initialValue' },
      { status: 422 }
    )
  }

  if (typeof initialValue !== 'number' || initialValue <= 0) {
    return NextResponse.json(
      { error: 'initialValue deve ser um número positivo' },
      { status: 422 }
    )
  }

  const existing = await prisma.budgetContract.findUnique({ where: { contractNumber } })
  if (existing) {
    return NextResponse.json({ error: 'Contrato já cadastrado' }, { status: 409 })
  }

  const contract = await prisma.budgetContract.create({
    data: {
      contractNumber,
      initialValue,
      currentTotal: initialValue,
    },
  })

  return NextResponse.json(contract, { status: 201 })
}
