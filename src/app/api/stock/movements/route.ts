import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import type { StockMovementType } from '@prisma/client'

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

  const { searchParams } = request.nextUrl
  const itemId = searchParams.get('itemId')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const skip = (page - 1) * limit

  const where = itemId ? { itemId } : {}

  const [data, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        item: { select: { id: true, name: true, unit: true } },
        user: { select: { id: true, fullName: true, photoUrl: true } },
      },
      orderBy: { occurredAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.stockMovement.count({ where }),
  ])

  return NextResponse.json({ data, total, page, limit })
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (authUser.role === 'AUDIT_VIEWER') {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const body = await request.json() as {
    type?: StockMovementType
    itemId?: string
    quantity?: number
    targetLocationId?: string
    notes?: string
  }

  if (!body.type || !body.itemId || body.quantity === undefined) {
    return NextResponse.json({ error: 'Campos obrigatórios: type, itemId, quantity' }, { status: 422 })
  }

  if (!['IN', 'OUT', 'TRANSFER'].includes(body.type)) {
    return NextResponse.json({ error: 'Tipo inválido. Use IN, OUT ou TRANSFER' }, { status: 422 })
  }

  const item = await prisma.stockItem.findUnique({ where: { id: body.itemId } })
  if (!item) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })

  if (body.type === 'OUT' && item.quantity < body.quantity) {
    return NextResponse.json({ error: 'Quantidade insuficiente em estoque' }, { status: 422 })
  }

  const value = body.quantity * item.unitPrice

  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        type: body.type,
        itemId: body.itemId,
        quantity: body.quantity,
        value,
        userId: authUser.id,
        targetLocationId: body.targetLocationId,
        notes: body.notes,
      },
    }),
    prisma.stockItem.update({
      where: { id: body.itemId },
      data: {
        quantity: body.type === 'IN'
          ? { increment: body.quantity }
          : { decrement: body.quantity },
      },
    }),
  ])

  return NextResponse.json(movement, { status: 201 })
}
