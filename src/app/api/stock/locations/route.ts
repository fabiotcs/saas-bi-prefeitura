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

  const locations = await prisma.storageLocation.findMany({
    include: { secretary: { select: { id: true, name: true } }, _count: { select: { stockItems: true } } },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ data: locations })
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (!['MAIN_MANAGER', 'SECRETARY_MANAGER'].includes(authUser.role)) {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const body = await request.json() as { name?: string; secretaryId?: string; observations?: string }
  if (!body.name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 422 })

  const location = await prisma.storageLocation.create({
    data: { name: body.name, secretaryId: body.secretaryId, observations: body.observations },
  })

  return NextResponse.json(location, { status: 201 })
}
