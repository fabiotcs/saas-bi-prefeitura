import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import type { BiometricStatus } from '@prisma/client'

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return null

  try {
    const payload = await verifyToken(token)
    if (payload.type !== 'access') return null
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    return user
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (user.role !== 'MAIN_MANAGER' && user.role !== 'AUDIT_VIEWER') {
      return NextResponse.json(
        { error: 'Acesso negado. Somente MAIN_MANAGER e AUDIT_VIEWER podem acessar o histórico biométrico.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') ?? undefined
    const statusParam = searchParams.get('status') as BiometricStatus | null
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))

    const where: {
      userId?: string
      status?: BiometricStatus
      createdAt?: { gte?: Date; lte?: Date }
    } = {}

    if (userId) where.userId = userId
    if (statusParam && ['SUCCESS', 'FAILED', 'SUSPICIOUS'].includes(statusParam)) {
      where.status = statusParam
    }
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) where.createdAt.lte = new Date(to)
    }

    const [records, total] = await Promise.all([
      prisma.biometricRecord.findMany({
        where,
        include: {
          user: {
            select: { fullName: true, email: true, photoUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.biometricRecord.count({ where }),
    ])

    return NextResponse.json({ data: records, total, page, limit })
  } catch (error) {
    console.error('Error in GET /api/auth/biometric-history:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
