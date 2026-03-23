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

  const [totalApiKeys, activeApiKeys, totalCalls, last24h] = await Promise.all([
    prisma.apiKey.count(),
    prisma.apiKey.count({ where: { revoked: false } }),
    prisma.apiCallLog.count(),
    prisma.apiCallLog.count({
      where: { occurredAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
  ])

  // Average response time (last 100 calls)
  const recentLogs = await prisma.apiCallLog.findMany({
    orderBy: { occurredAt: 'desc' },
    take: 100,
    select: { responseTimeMs: true, statusCode: true },
  })

  const avgResponseTime =
    recentLogs.length > 0
      ? recentLogs.reduce((sum, l) => sum + l.responseTimeMs, 0) / recentLogs.length
      : 0

  const successCount = recentLogs.filter((l) => l.statusCode >= 200 && l.statusCode < 300).length
  const successRate = recentLogs.length > 0 ? (successCount / recentLogs.length) * 100 : 0

  return NextResponse.json({
    totalApiKeys,
    activeApiKeys,
    revokedApiKeys: totalApiKeys - activeApiKeys,
    totalCalls,
    callsLast24h: last24h,
    avgResponseTimeMs: Math.round(avgResponseTime),
    successRate: Math.round(successRate * 10) / 10,
  })
}
