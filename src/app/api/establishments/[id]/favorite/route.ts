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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json() as { favorite: boolean }

  if (body.favorite) {
    await prisma.establishmentFavorite.upsert({
      where: { userId_establishmentId: { userId: authUser.id, establishmentId: params.id } },
      create: { userId: authUser.id, establishmentId: params.id },
      update: {},
    })
  } else {
    await prisma.establishmentFavorite.deleteMany({
      where: { userId: authUser.id, establishmentId: params.id },
    })
  }

  return NextResponse.json({ isFavorite: body.favorite })
}
