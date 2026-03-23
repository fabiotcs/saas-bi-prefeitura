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

  if (authUser.role !== 'MAIN_MANAGER' && authUser.role !== 'SECRETARY_MANAGER') {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  let body: {
    secretaryId?: string
    value?: number
    otpCode?: string
    twoFactorRequestId?: string
    fileUrl?: string
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 })
  }

  const { secretaryId, value, otpCode, twoFactorRequestId, fileUrl } = body

  if (!secretaryId || !value || !otpCode || !twoFactorRequestId) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: secretaryId, value, otpCode, twoFactorRequestId' },
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

  // Check available balance
  const availableBalance = contract.currentTotal - contract.allocatedViaCommitment
  if (availableBalance < value) {
    return NextResponse.json(
      {
        error: 'Saldo insuficiente no contrato',
        reason: 'insufficient_balance',
        available: availableBalance,
        requested: value,
      },
      { status: 422 }
    )
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

  // Create commitment, update contract and secretary
  const commitment = await prisma.budgetCommitment.create({
    data: {
      contractId: params.id,
      secretaryId,
      value,
      fileUrl: fileUrl ?? null,
      registeredById: authUser.id,
    },
    include: {
      secretary: { select: { id: true, name: true } },
      registeredBy: { select: { id: true, fullName: true } },
    },
  })

  await prisma.budgetContract.update({
    where: { id: params.id },
    data: {
      allocatedViaCommitment: { increment: value },
    },
  })

  await prisma.secretary.update({
    where: { id: secretaryId },
    data: {
      budgetAllocated: { increment: value },
    },
  })

  return NextResponse.json(commitment, { status: 201 })
}
