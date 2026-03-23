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

  const settings = await prisma.systemSettings.upsert({
    where: { id: 'system' },
    update: {},
    create: {
      id: 'system',
      billingMode: 'CENTRALIZED',
      billingClosingDay: 25,
      requireManagerApproval: true,
      requireBudgetValidation: true,
      minimumProposalsForApproval: 3,
      restrictOrderCreationToVerifiedUsers: false,
    },
  })

  return NextResponse.json(settings)
}

export async function PATCH(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (authUser.role !== 'MAIN_MANAGER') {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const body = await request.json() as {
    billingMode?: string
    billingClosingDay?: number
    requireManagerApproval?: boolean
    requireBudgetValidation?: boolean
    minimumProposalsForApproval?: number
    restrictOrderCreationToVerifiedUsers?: boolean
  }

  if (
    body.billingClosingDay !== undefined &&
    (body.billingClosingDay < 1 || body.billingClosingDay > 28)
  ) {
    return NextResponse.json(
      { error: 'billingClosingDay deve estar entre 1 e 28' },
      { status: 422 }
    )
  }

  const updateData: Record<string, unknown> = {}
  if (body.billingMode !== undefined) updateData.billingMode = body.billingMode
  if (body.billingClosingDay !== undefined) updateData.billingClosingDay = body.billingClosingDay
  if (body.requireManagerApproval !== undefined) updateData.requireManagerApproval = body.requireManagerApproval
  if (body.requireBudgetValidation !== undefined) updateData.requireBudgetValidation = body.requireBudgetValidation
  if (body.minimumProposalsForApproval !== undefined) updateData.minimumProposalsForApproval = body.minimumProposalsForApproval
  if (body.restrictOrderCreationToVerifiedUsers !== undefined) updateData.restrictOrderCreationToVerifiedUsers = body.restrictOrderCreationToVerifiedUsers

  const settings = await prisma.systemSettings.upsert({
    where: { id: 'system' },
    update: updateData,
    create: {
      id: 'system',
      billingMode: (body.billingMode as 'CENTRALIZED' | 'DECENTRALIZED') ?? 'CENTRALIZED',
      billingClosingDay: body.billingClosingDay ?? 25,
      requireManagerApproval: body.requireManagerApproval ?? true,
      requireBudgetValidation: body.requireBudgetValidation ?? true,
      minimumProposalsForApproval: body.minimumProposalsForApproval ?? 3,
      restrictOrderCreationToVerifiedUsers: body.restrictOrderCreationToVerifiedUsers ?? false,
    },
  })

  return NextResponse.json(settings)
}
