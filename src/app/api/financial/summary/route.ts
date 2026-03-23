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

  const allowedRoles = ['MAIN_MANAGER', 'SECRETARY_MANAGER', 'AUDIT_VIEWER']
  if (!allowedRoles.includes(authUser.role)) {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where = {
    ...(from || to
      ? {
          periodStart: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: { secretary: { select: { id: true, name: true } } },
  })

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalBilled, 0)
  const totalNet = invoices.reduce((sum, inv) => sum + inv.totalNet, 0)
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.totalPaid, 0)

  const bySecretaryMap = new Map<string, { secretaryId: string; name: string; total: number }>()
  for (const inv of invoices) {
    const key = inv.secretaryId
    const existing = bySecretaryMap.get(key)
    if (existing) {
      existing.total += inv.totalBilled
    } else {
      bySecretaryMap.set(key, {
        secretaryId: inv.secretaryId,
        name: inv.secretary.name,
        total: inv.totalBilled,
      })
    }
  }

  return NextResponse.json({
    totalBilled,
    totalNet,
    totalPaid,
    bySecretary: Array.from(bySecretaryMap.values()),
  })
}
