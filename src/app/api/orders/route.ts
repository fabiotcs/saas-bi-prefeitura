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

  if (authUser.role === 'AUDIT_VIEWER') {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''
  const secretaryId = searchParams.get('secretaryId') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (status) {
    where.status = status
  }

  if (secretaryId) {
    where.secretaryId = secretaryId
  }

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        secretary: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true, photoUrl: true } },
        _count: { select: { chatMessages: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ])

  return NextResponse.json({ data, total, page, limit })
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (authUser.role !== 'MAIN_MANAGER' && authUser.role !== 'SECRETARY_MANAGER') {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const body = await request.json() as {
    name?: string
    category?: string
    secretaryId?: string
    subSecretaryId?: string
    investmentArea?: string
    quotationStartDate?: string
    quotationEndDate?: string
    desiredDeliveryDate?: string
    regionRadius?: number
    specificMunicipality?: string
    receiverName?: string
    observations?: string
    items?: Array<{ name: string; imageUrl?: string; unit: string; quantity: number; referenceValue: number }>
    deliveryLocations?: Array<{ name: string; zipCode: string; address: string; city: string; state: string }>
  }

  const { name, category, secretaryId, investmentArea, receiverName, items, deliveryLocations } = body

  if (!name || !category || !secretaryId || !investmentArea || !receiverName) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: name, category, secretaryId, investmentArea, receiverName' },
      { status: 422 }
    )
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'Pelo menos um item é obrigatório' }, { status: 422 })
  }

  if (!deliveryLocations || deliveryLocations.length === 0) {
    return NextResponse.json({ error: 'Pelo menos um local de entrega é obrigatório' }, { status: 422 })
  }

  // Generate order code
  const year = new Date().getFullYear()
  const lastOrder = await prisma.order.findFirst({
    where: { code: { startsWith: `OS-${year}-` } },
    orderBy: { code: 'desc' },
  })
  let seq = 1
  if (lastOrder) {
    const lastSeq = parseInt(lastOrder.code.split('-')[2])
    seq = lastSeq + 1
  }
  const code = `OS-${year}-${String(seq).padStart(4, '0')}`

  const order = await prisma.order.create({
    data: {
      code,
      name,
      category: category as 'MATERIAL' | 'SERVICE' | 'EQUIPMENT',
      secretaryId,
      subSecretaryId: body.subSecretaryId ?? null,
      investmentArea,
      quotationStartDate: body.quotationStartDate ? new Date(body.quotationStartDate) : null,
      quotationEndDate: body.quotationEndDate ? new Date(body.quotationEndDate) : null,
      desiredDeliveryDate: body.desiredDeliveryDate ? new Date(body.desiredDeliveryDate) : null,
      regionRadius: body.regionRadius ?? null,
      specificMunicipality: body.specificMunicipality ?? null,
      receiverName,
      observations: body.observations ?? null,
      createdByUserId: authUser.id,
    },
  })

  await prisma.orderItem.createMany({
    data: items.map((item) => ({
      orderId: order.id,
      name: item.name,
      imageUrl: item.imageUrl ?? null,
      unit: item.unit,
      quantity: item.quantity,
      referenceValue: item.referenceValue,
    })),
  })

  await prisma.deliveryLocation.createMany({
    data: deliveryLocations.map((loc) => ({
      orderId: order.id,
      name: loc.name,
      zipCode: loc.zipCode,
      address: loc.address,
      city: loc.city,
      state: loc.state,
    })),
  })

  await prisma.orderTimeline.create({
    data: {
      orderId: order.id,
      step: 'CREATED',
      userId: authUser.id,
    },
  })

  return NextResponse.json(order, { status: 201 })
}
