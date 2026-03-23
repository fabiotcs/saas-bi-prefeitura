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
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const order = await prisma.order.findUnique({
    where: { id: params.id },
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

  if (!order) return NextResponse.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 })

  return NextResponse.json(order)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (authUser.role !== 'MAIN_MANAGER' && authUser.role !== 'SECRETARY_MANAGER') {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const order = await prisma.order.findUnique({ where: { id: params.id } })
  if (!order) return NextResponse.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 })

  const body = await request.json() as Partial<{
    name: string
    category: 'MATERIAL' | 'SERVICE' | 'EQUIPMENT'
    secretaryId: string
    subSecretaryId: string | null
    investmentArea: string
    quotationStartDate: string | null
    quotationEndDate: string | null
    desiredDeliveryDate: string | null
    regionRadius: number | null
    specificMunicipality: string | null
    receiverName: string
    observations: string | null
  }>

  const allowedFields = [
    'name', 'category', 'secretaryId', 'subSecretaryId', 'investmentArea',
    'quotationStartDate', 'quotationEndDate', 'desiredDeliveryDate',
    'regionRadius', 'specificMunicipality', 'receiverName', 'observations',
  ] as const

  const data: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) {
      if (field === 'quotationStartDate' || field === 'quotationEndDate' || field === 'desiredDeliveryDate') {
        data[field] = body[field] ? new Date(body[field] as string) : null
      } else {
        data[field] = body[field]
      }
    }
  }

  const updated = await prisma.order.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json(updated)
}
