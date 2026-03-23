import { prisma } from '@/lib/prisma'
import type { AuditStatus } from '@prisma/client'
import type { NextRequest } from 'next/server'

export async function recordAuditLog(
  request: NextRequest,
  options: {
    userId?: string
    action: string
    status: AuditStatus
    metadata?: Record<string, unknown>
  }
) {
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '0.0.0.0'
  const userAgent = request.headers.get('user-agent') ?? ''

  await prisma.auditLog
    .create({
      data: {
        action: options.action,
        urlPath: request.nextUrl.pathname,
        userId: options.userId,
        userAgent,
        ipAddress,
        status: options.status,
        metadata: options.metadata ? (options.metadata as import('@prisma/client').Prisma.InputJsonValue) : undefined,
      },
    })
    .catch(() => {}) // audit logging must never break request flow
}
