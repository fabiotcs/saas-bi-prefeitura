import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'

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

const ALLOWED_ROLES = ['MAIN_MANAGER', 'AUDIT_VIEWER', 'SECRETARY_MANAGER'] as const

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (!ALLOWED_ROLES.includes(authUser.role as typeof ALLOWED_ROLES[number])) {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const log = await prisma.auditLog.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, fullName: true, photoUrl: true, email: true } },
    },
  })

  if (!log) return NextResponse.json({ error: 'Log não encontrado' }, { status: 404 })
  return NextResponse.json(log)
}

export async function DELETE(
  _request: NextRequest,
  _context: { params: { id: string } }
) {
  return NextResponse.json(
    { error: 'Logs de auditoria são imutáveis' },
    { status: 403 }
  )
}

export async function PATCH(
  _request: NextRequest,
  _context: { params: { id: string } }
) {
  return NextResponse.json(
    { error: 'Logs de auditoria são imutáveis' },
    { status: 403 }
  )
}
