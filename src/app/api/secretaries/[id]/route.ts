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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const secretary = await prisma.secretary.findUnique({
    where: { id: params.id },
    include: {
      parent: { select: { id: true, name: true } },
      subSecretaries: { select: { id: true, name: true, budgetAllocated: true, budgetUsed: true } },
      _count: { select: { orders: true } },
    },
  })

  if (!secretary) return NextResponse.json({ error: 'Secretaria não encontrada' }, { status: 404 })
  return NextResponse.json(secretary)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const isMainManager = authUser.role === 'MAIN_MANAGER'
  const isOwningSecretary = authUser.role === 'SECRETARY_MANAGER' && authUser.secretaryId === params.id

  if (!isMainManager && !isOwningSecretary) {
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

  if (body.cnpj && !isValidCNPJ(body.cnpj)) {
    return NextResponse.json({ error: 'CNPJ inválido' }, { status: 422 })
  }

  if (body.name) {
    const dup = await prisma.secretary.findFirst({
      where: { name: body.name, id: { not: params.id } },
    })
    if (dup) return NextResponse.json({ error: 'Secretaria já cadastrada' }, { status: 409 })
  }

  const updated = await prisma.secretary.update({
    where: { id: params.id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.phone && { phone: body.phone }),
      ...(body.cnpj && { cnpj: body.cnpj.replace(/\D/g, '') }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.secretaryPersonName && { secretaryPersonName: body.secretaryPersonName }),
      // budgetAllocated e parentId: apenas MAIN_MANAGER pode alterar
      ...(isMainManager && body.budgetAllocated !== undefined && { budgetAllocated: body.budgetAllocated }),
      ...(isMainManager && body.parentId !== undefined && { parentId: body.parentId }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (authUser.role !== 'MAIN_MANAGER') {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  await prisma.secretary.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
