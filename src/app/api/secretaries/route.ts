import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { isValidCNPJ } from '@/lib/cnpj'

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
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const skip = (page - 1) * limit

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { secretaryPersonName: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [data, total] = await Promise.all([
    prisma.secretary.findMany({
      where,
      include: {
        parent: { select: { id: true, name: true } },
        subSecretaries: { select: { id: true, name: true } },
        users: { select: { id: true, fullName: true, photoUrl: true, role: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.secretary.count({ where }),
  ])

  return NextResponse.json({ data, total, page, limit })
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (authUser.role !== 'MAIN_MANAGER') {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const body = await request.json() as {
    name?: string
    phone?: string
    cnpj?: string
    description?: string
    secretaryPersonName?: string
    budgetAllocated?: number
    parentId?: string
  }

  const { name, phone, cnpj, description, secretaryPersonName, budgetAllocated, parentId } = body

  if (!name || !phone || !cnpj || !secretaryPersonName) {
    return NextResponse.json({ error: 'Campos obrigatórios: name, phone, cnpj, secretaryPersonName' }, { status: 422 })
  }

  if (!isValidCNPJ(cnpj)) {
    return NextResponse.json({ error: 'CNPJ inválido' }, { status: 422 })
  }

  const existing = await prisma.secretary.findFirst({
    where: { OR: [{ name }, { cnpj: cnpj.replace(/\D/g, '') }] },
  })
  if (existing) {
    if (existing.name === name) {
      return NextResponse.json({ error: 'Secretaria já cadastrada' }, { status: 409 })
    }
    return NextResponse.json({ error: 'CNPJ já cadastrado' }, { status: 409 })
  }

  const secretary = await prisma.secretary.create({
    data: {
      name,
      phone,
      cnpj: cnpj.replace(/\D/g, ''),
      description,
      secretaryPersonName,
      budgetAllocated: budgetAllocated ?? 0,
      parentId: parentId ?? null,
    },
  })

  return NextResponse.json(secretary, { status: 201 })
}
