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
  const q = (searchParams.get('q') ?? '').trim()

  const items = await prisma.stockItem.findMany({
    where: q
      ? { name: { contains: q, mode: 'insensitive' } }
      : undefined,
    select: {
      id: true,
      name: true,
      imageUrl: true,
      unit: true,
      unitPrice: true,
      abcClass: true,
    },
    orderBy: { name: 'asc' },
    take: 20,
  })

  const data = items.map((item) => ({
    id: item.id,
    name: item.name,
    imageUrl: item.imageUrl ?? null,
    unit: item.unit,
    referenceValue: item.unitPrice,
    category: item.abcClass ?? null,
  }))

  return NextResponse.json({ data })
}
