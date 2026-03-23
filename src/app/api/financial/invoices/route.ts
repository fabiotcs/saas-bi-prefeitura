import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import type { InvoiceStatus } from '@prisma/client'

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

  const allowedRoles = ['MAIN_MANAGER', 'SECRETARY_MANAGER', 'AUDIT_VIEWER']
  if (!allowedRoles.includes(authUser.role)) {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const secretaryId = searchParams.get('secretaryId')
  const status = searchParams.get('status') as InvoiceStatus | null
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const skip = (page - 1) * limit

  const where = {
    ...(secretaryId ? { secretaryId } : {}),
    ...(status ? { status } : {}),
    ...(from || to
      ? {
          periodStart: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  }

  const [data, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        secretary: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ])

  return NextResponse.json({ data, total, page, limit })
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (authUser.role !== 'MAIN_MANAGER') {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const body = await request.json() as {
    secretaryId?: string
    subSecretaryId?: string
    periodStart?: string
    periodEnd?: string
    totalBilled?: number
    totalNet?: number
    totalPaid?: number
    status?: InvoiceStatus
    paymentProofUrl?: string
    items?: Array<{
      orderId?: string
      itemName: string
      quantity: number
      unitPrice: number
      total: number
    }>
  }

  const { secretaryId, periodStart, periodEnd, totalBilled, totalNet, totalPaid, status, subSecretaryId, paymentProofUrl, items } = body

  if (!secretaryId || !periodStart || !periodEnd) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: secretaryId, periodStart, periodEnd' },
      { status: 422 }
    )
  }

  const invoice = await prisma.invoice.create({
    data: {
      secretaryId,
      subSecretaryId: subSecretaryId ?? null,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      totalBilled: totalBilled ?? 0,
      totalNet: totalNet ?? 0,
      totalPaid: totalPaid ?? 0,
      status: status ?? 'PENDING',
      paymentProofUrl: paymentProofUrl ?? null,
    },
  })

  if (items && items.length > 0) {
    await prisma.invoiceItem.createMany({
      data: items.map((item) => ({
        invoiceId: invoice.id,
        orderId: item.orderId ?? null,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
    })
  }

  const result = await prisma.invoice.findUnique({
    where: { id: invoice.id },
    include: {
      secretary: { select: { id: true, name: true } },
      items: true,
    },
  })

  return NextResponse.json(result, { status: 201 })
}
