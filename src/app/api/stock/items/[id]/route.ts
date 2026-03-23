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

  const item = await prisma.stockItem.findUnique({
    where: { id: params.id },
    include: {
      storageLocation: true,
      movements: {
        include: { user: { select: { id: true, fullName: true, photoUrl: true } } },
        orderBy: { occurredAt: 'desc' },
        take: 20,
      },
    },
  })

  if (!item) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
  return NextResponse.json(item)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (!['MAIN_MANAGER', 'SECRETARY_MANAGER'].includes(authUser.role)) {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const body = await request.json() as Record<string, unknown>

  const updated = await prisma.stockItem.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name as string }),
      ...(body.unit !== undefined && { unit: body.unit as string }),
      ...(body.unitPrice !== undefined && { unitPrice: body.unitPrice as number }),
      ...(body.minimumAlert !== undefined && { minimumAlert: body.minimumAlert as number }),
      ...(body.barcode !== undefined && { barcode: body.barcode as string }),
      ...(body.storageLocationId !== undefined && { storageLocationId: body.storageLocationId as string | null }),
    },
  })

  return NextResponse.json(updated)
}
