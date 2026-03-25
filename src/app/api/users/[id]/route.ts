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
      documentVerified: true, approvalLimit: true,
      secretaryId: true, createdAt: true, updatedAt: true,
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

  const isMainManager = authUser.role === 'MAIN_MANAGER'
  const isSelf = authUser.id === params.id

  // SECRETARY_MANAGER pode editar usuários dentro da sua secretaria
  let canEdit = isMainManager || isSelf
  if (!canEdit && authUser.role === 'SECRETARY_MANAGER' && authUser.secretaryId) {
    const targetUser = await prisma.user.findUnique({ where: { id: params.id }, select: { secretaryId: true } })
    if (targetUser?.secretaryId === authUser.secretaryId) canEdit = true
  }

  if (!canEdit) {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const body = await request.json() as Partial<{
    fullName: string
    phone: string
    role: UserRole
    secretaryId: string | null
    approvalLimit: number
  }>

  // SECRETARY_MANAGER não pode elevar role para MAIN_MANAGER ou AUDIT_VIEWER, nem mover o usuário para outra secretaria
  if (authUser.role === 'SECRETARY_MANAGER') {
    if (body.role === 'MAIN_MANAGER' || body.role === 'AUDIT_VIEWER') {
      return NextResponse.json({ error: 'Não é permitido atribuir este perfil' }, { status: 403 })
    }
    delete body.secretaryId
  }

  const allowedFields = ['fullName', 'phone', 'role', 'secretaryId', 'approvalLimit'] as const
  const data: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) data[field] = body[field]
  }
  // Não-gerentes não podem alterar role ou approvalLimit de outros
  if (!isMainManager && !isSelf) {
    delete data.role
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
