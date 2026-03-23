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

  const establishment = await prisma.establishment.findUnique({
    where: { id: params.id },
    include: {
      favorites: { where: { userId: authUser.id }, select: { id: true } },
    },
  })

  if (!establishment) {
    return NextResponse.json({ error: 'Estabelecimento não encontrado' }, { status: 404 })
  }

  const { favorites, ...est } = establishment
  return NextResponse.json({ ...est, isFavorite: favorites.length > 0 })
}
