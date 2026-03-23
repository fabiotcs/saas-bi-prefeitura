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
  const city = searchParams.get('city') ?? ''
  const state = searchParams.get('state') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (search) where.name = { contains: search, mode: 'insensitive' }
  if (city) where.city = { contains: city, mode: 'insensitive' }
  if (state) where.state = state

  const [establishments, total] = await Promise.all([
    prisma.establishment.findMany({
      where,
      include: {
        favorites: { where: { userId: authUser.id }, select: { id: true } },
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.establishment.count({ where }),
  ])

  const data = establishments.map(({ favorites, ...est }) => ({
    ...est,
    isFavorite: favorites.length > 0,
  }))

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
    cnpj?: string
    address?: string
    city?: string
    state?: string
    phone?: string
    email?: string
    servicesDescription?: string
  }

  if (!body.name || !body.cnpj) {
    return NextResponse.json({ error: 'Campos obrigatórios: name, cnpj' }, { status: 422 })
  }

  const establishment = await prisma.establishment.create({
    data: {
      name: body.name,
      cnpj: body.cnpj,
      address: body.address ?? '',
      city: body.city ?? '',
      state: body.state ?? '',
      phone: body.phone ?? '',
      email: body.email,
      servicesDescription: body.servicesDescription ?? '',
    },
  })

  return NextResponse.json(establishment, { status: 201 })
}
