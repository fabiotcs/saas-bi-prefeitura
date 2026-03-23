import { prisma } from '@/lib/prisma'
import type { AuditStatus } from '@prisma/client'

export interface ListAuditLogsParams {
  userId?: string
  status?: AuditStatus
  from?: string
  to?: string
  page?: number
  limit?: number
}

export async function listAuditLogs(params: ListAuditLogsParams) {
  const { userId, status, from, to, page = 1, limit = 20 } = params
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (userId) where.userId = userId
  if (status) where.status = status
  if (from || to) {
    where.occurredAt = {}
    if (from) (where.occurredAt as Record<string, unknown>).gte = new Date(from)
    if (to) (where.occurredAt as Record<string, unknown>).lte = new Date(to)
  }

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, fullName: true, photoUrl: true, email: true } } },
      orderBy: { occurredAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ])

  return { data, total, page, limit }
}
