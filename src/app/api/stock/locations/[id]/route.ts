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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (!['MAIN_MANAGER', 'SECRETARY_MANAGER'].includes(authUser.role)) {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const existing = await prisma.storageLocation.findUnique({
    where: { id: params.id },
    include: { _count: { select: { stockItems: true } } },
  })

  if (!existing) return NextResponse.json({ error: 'Local não encontrado' }, { status: 404 })

  if (existing._count.stockItems > 0) {
    return NextResponse.json(
      { error: `Este local possui ${existing._count.stockItems} item(s) vinculado(s). Desvincule-os antes de excluir.` },
      { status: 409 }
    )
  }

  await prisma.storageLocation.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (!['MAIN_MANAGER', 'SECRETARY_MANAGER'].includes(authUser.role)) {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const body = await request.json() as { name?: string; observations?: string }
  if (!body.name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 422 })

  const location = await prisma.storageLocation.update({
    where: { id: params.id },
    data: { name: body.name, observations: body.observations },
  })

  return NextResponse.json(location)
}
