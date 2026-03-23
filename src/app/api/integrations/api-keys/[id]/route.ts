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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const apiKey = await prisma.apiKey.findUnique({ where: { id: params.id } })

  if (!apiKey) {
    return NextResponse.json({ error: 'API Key não encontrada' }, { status: 404 })
  }

  const isAdmin = authUser.role === 'MAIN_MANAGER'
  const isOwner = apiKey.createdById === authUser.id

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Sem permissão para revogar esta API Key' }, { status: 403 })
  }

  const updated = await prisma.apiKey.update({
    where: { id: params.id },
    data: { revoked: true },
    select: {
      id: true,
      name: true,
      revoked: true,
    },
  })

  return NextResponse.json(updated)
}
