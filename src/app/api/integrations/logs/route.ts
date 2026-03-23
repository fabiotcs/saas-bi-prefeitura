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

  const { searchParams } = new URL(request.url)
  const apiKeyId = searchParams.get('apiKeyId') ?? undefined
  const statusCode = searchParams.get('statusCode') ? Number(searchParams.get('statusCode')) : undefined
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined
  const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 50)

  // Non-admins can only see logs for their own API keys
  const userApiKeyIds =
    authUser.role === 'MAIN_MANAGER'
      ? undefined
      : (
          await prisma.apiKey.findMany({
            where: { createdById: authUser.id },
            select: { id: true },
          })
        ).map((k) => k.id)

  const where: Record<string, unknown> = {}

  if (apiKeyId) {
    where.apiKeyId = apiKeyId
  } else if (userApiKeyIds) {
    where.apiKeyId = { in: userApiKeyIds }
  }

  if (statusCode !== undefined && !isNaN(statusCode)) {
    where.statusCode = statusCode
  }

  if (from || to) {
    where.occurredAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    }
  }

  const logs = await prisma.apiCallLog.findMany({
    where,
    orderBy: { occurredAt: 'desc' },
    take: limit,
  })

  return NextResponse.json(logs)
}
