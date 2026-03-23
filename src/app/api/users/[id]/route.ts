import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import type { UserRole } from '@prisma/client'

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
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

  if (authUser.role === 'SECRETARY_USER') {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true, fullName: true, email: true, role: true,
      birthDate: true, phone: true, cpf: true, rg: true,
      photoUrl: true, lastLogin: true, biometricVerified: true,
      documentVerified: true, secretaryId: true, createdAt: true, updatedAt: true,
    },
  })

  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  return NextResponse.json(user)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (authUser.role !== 'MAIN_MANAGER' && authUser.id !== params.id) {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const body = await request.json() as Partial<{
    fullName: string
    phone: string
    role: UserRole
    secretaryId: string | null
  }>

  const allowedFields = ['fullName', 'phone', 'role', 'secretaryId'] as const
  const data: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) data[field] = body[field]
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: {
      id: true, fullName: true, email: true, role: true, updatedAt: true,
    },
  })

  return NextResponse.json(user)
}
