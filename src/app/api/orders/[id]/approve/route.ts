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

  const order = await prisma.order.findUnique({ where: { id: params.id } })
  if (!order) {
    return NextResponse.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 })
  }

  let body: { otpCode?: string; twoFactorRequestId?: string }
  try {
    body = (await request.json()) as { otpCode?: string; twoFactorRequestId?: string }
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 })
  }

  const { otpCode, twoFactorRequestId } = body

  if (!otpCode || !twoFactorRequestId) {
    return NextResponse.json(
      { error: 'otpCode e twoFactorRequestId são obrigatórios' },
      { status: 400 }
    )
  }

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

  // 2FA valid — mark as used and approve the order
  await prisma.twoFactorRequest.update({
    where: { id: twoFactorRequestId },
    data: { used: true },
  })

  const updatedOrder = await prisma.order.update({
    where: { id: params.id },
    data: { status: 'APPROVED' },
    include: {
      secretary: { select: { id: true, name: true } },
      subSecretary: { select: { id: true, name: true } },
      createdBy: { select: { id: true, fullName: true, photoUrl: true } },
      items: true,
      timeline: {
        include: {
          user: { select: { id: true, fullName: true, photoUrl: true } },
        },
        orderBy: { occurredAt: 'asc' },
      },
      deliveryLocations: true,
      deliveryRecords: true,
      nonConformities: true,
      invoices: true,
    },
  })

  await prisma.orderTimeline.create({
    data: {
      orderId: params.id,
      step: 'APPROVED',
      userId: authUser.id,
    },
  })

  return NextResponse.json(updatedOrder)
}
