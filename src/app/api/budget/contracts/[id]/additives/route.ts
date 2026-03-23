import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'

const BLOCK_FAIL_THRESHOLD = 3
const BLOCK_DURATION_MS = 5 * 60 * 1000

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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (authUser.role !== 'MAIN_MANAGER') {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  let body: {
    value?: number
    description?: string
    otpCode?: string
    twoFactorRequestId?: string
    fileUrl?: string
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 })
  }

  const { value, description, otpCode, twoFactorRequestId, fileUrl } = body

  if (!value || !description || !otpCode || !twoFactorRequestId) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: value, description, otpCode, twoFactorRequestId' },
      { status: 400 }
    )
  }

  if (typeof value !== 'number' || value <= 0) {
    return NextResponse.json({ error: 'value deve ser um número positivo' }, { status: 422 })
  }

  const contract = await prisma.budgetContract.findUnique({ where: { id: params.id } })
  if (!contract) {
    return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
  }

  // 2FA validation
  const tfRecord = await prisma.twoFactorRequest.findUnique({
    where: { id: twoFactorRequestId },
  })

  if (!tfRecord) {
    return NextResponse.json(
      { error: 'Requisição 2FA não encontrada', reason: 'not_found' },
      { status: 422 }
    )
  }

  const now = new Date()

  if (tfRecord.blockedUntil && tfRecord.blockedUntil > now) {
    return NextResponse.json(
      {
        error: 'Conta bloqueada por muitas tentativas incorretas',
        reason: 'blocked',
        blockedUntil: tfRecord.blockedUntil.toISOString(),
      },
      { status: 422 }
    )
  }

  if (tfRecord.used) {
    return NextResponse.json(
      { error: 'Código 2FA já utilizado', reason: 'already_used' },
      { status: 422 }
    )
  }

  if (tfRecord.expiresAt <= now) {
    return NextResponse.json(
      { error: 'Código 2FA expirado', reason: 'expired' },
      { status: 422 }
    )
  }

  const isValid = await bcrypt.compare(otpCode, tfRecord.otpHash)

  if (!isValid) {
    const newFailCount = tfRecord.failCount + 1
    const shouldBlock = newFailCount >= BLOCK_FAIL_THRESHOLD

    const updatedRecord = await prisma.twoFactorRequest.update({
      where: { id: twoFactorRequestId },
      data: {
        failCount: newFailCount,
        ...(shouldBlock
          ? { blockedUntil: new Date(now.getTime() + BLOCK_DURATION_MS) }
          : {}),
      },
    })

    if (shouldBlock) {
      return NextResponse.json(
        {
          error: 'Conta bloqueada por muitas tentativas incorretas',
          reason: 'blocked',
          blockedUntil: updatedRecord.blockedUntil?.toISOString(),
        },
        { status: 422 }
      )
    }

    return NextResponse.json(
      { error: 'Código 2FA inválido', reason: 'invalid_code' },
      { status: 422 }
    )
  }

  // 2FA valid — mark as used
  await prisma.twoFactorRequest.update({
    where: { id: twoFactorRequestId },
    data: { used: true },
  })

  // Create additive and update contract totals
  const additive = await prisma.budgetAdditive.create({
    data: {
      contractId: params.id,
      value,
      description,
      fileUrl: fileUrl ?? null,
      approvedById: authUser.id,
    },
    include: {
      approvedBy: { select: { id: true, fullName: true } },
    },
  })

  await prisma.budgetContract.update({
    where: { id: params.id },
    data: {
      additivesTotal: { increment: value },
      currentTotal: { increment: value },
    },
  })

  return NextResponse.json(additive, { status: 201 })
}
