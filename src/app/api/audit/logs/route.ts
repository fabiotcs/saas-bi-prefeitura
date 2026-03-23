import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { listAuditLogs } from '@/services/audit.service'
import type { AuditStatus } from '@prisma/client'

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

export async function GET(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (!ALLOWED_ROLES.includes(authUser.role as typeof ALLOWED_ROLES[number])) {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') ?? undefined
  const statusParam = searchParams.get('status')
  const from = searchParams.get('from') ?? undefined
  const to = searchParams.get('to') ?? undefined
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)))

  const validStatuses: AuditStatus[] = ['SUCCESS', 'FAILED', 'SUSPICIOUS']
  const status =
    statusParam && validStatuses.includes(statusParam as AuditStatus)
      ? (statusParam as AuditStatus)
      : undefined

  const result = await listAuditLogs({ userId, status, from, to, page, limit })

  return NextResponse.json(result)
}
