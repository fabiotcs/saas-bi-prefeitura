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

  const { searchParams } = request.nextUrl
  const search = searchParams.get('search') ?? ''
  const barcode = searchParams.get('barcode') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (search) where.name = { contains: search, mode: 'insensitive' }
  if (barcode) where.barcode = barcode

  const [data, total] = await Promise.all([
    prisma.stockItem.findMany({
      where,
      include: { storageLocation: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.stockItem.count({ where }),
  ])

  return NextResponse.json({ data, total, page, limit })
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (!['MAIN_MANAGER', 'SECRETARY_MANAGER'].includes(authUser.role)) {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const body = await request.json() as {
    name?: string
    unit?: string
    quantity?: number
    unitPrice?: number
    minimumAlert?: number
    barcode?: string
    storageLocationId?: string
  }

  if (!body.name || !body.unit) {
    return NextResponse.json({ error: 'Campos obrigatórios: name, unit' }, { status: 422 })
  }

  const item = await prisma.stockItem.create({
    data: {
      name: body.name,
      unit: body.unit,
      quantity: body.quantity ?? 0,
      unitPrice: body.unitPrice ?? 0,
      minimumAlert: body.minimumAlert ?? 0,
      barcode: body.barcode,
      storageLocationId: body.storageLocationId,
    },
  })

  return NextResponse.json(item, { status: 201 })
}
