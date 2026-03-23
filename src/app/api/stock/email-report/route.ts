import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { mailer, FROM_ADDRESS, buildStockEmailHtml } from '@/lib/mailer'

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

export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (authUser.role !== 'MAIN_MANAGER' && authUser.role !== 'SECRETARY_MANAGER') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const from = new Date()
  from.setDate(from.getDate() - 7)

  const [totalItems, movements, allItems] = await Promise.all([
    prisma.stockItem.count(),
    prisma.stockMovement.groupBy({
      by: ['itemId'],
      _count: { id: true },
      where: { occurredAt: { gte: from } },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
    prisma.stockItem.findMany({ select: { id: true, name: true, abcClass: true, quantity: true, minimumAlert: true } }),
  ])

  const alertItems = allItems.filter((i) => i.quantity <= i.minimumAlert).length

  const topMovements = await Promise.all(
    movements.map(async (m) => {
      const item = allItems.find((i) => i.id === m.itemId)
      return {
        name: item?.name ?? 'Desconhecido',
        movements: m._count.id,
        abcClass: item?.abcClass ?? 'C',
      }
    }),
  )

  const abcSummary = allItems.reduce(
    (acc, item) => {
      const cls = (item.abcClass as 'A' | 'B' | 'C') ?? 'C'
      acc[cls] = (acc[cls] ?? 0) + 1
      return acc
    },
    { A: 0, B: 0, C: 0 },
  )

  const html = buildStockEmailHtml({
    totalItems: totalItems as number,
    alertItems: alertItems as number,
    topMovements,
    abcSummary,
    recipientName: authUser.fullName ?? authUser.email,
    recipientEmail: authUser.email,
  })

  await mailer.sendMail({
    from: FROM_ADDRESS,
    to: authUser.email,
    subject: `Resumo Semanal de Estoque — ${new Date().toLocaleDateString('pt-BR')}`,
    html,
  })

  return NextResponse.json({ message: 'E-mail enviado com sucesso.' })
}
