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

function getPeriodDates(period: string): { from: Date; to: Date } {
  const to = new Date()
  const from = new Date()
  switch (period) {
    case 'WEEKLY': from.setDate(from.getDate() - 7); break
    case 'MONTHLY': from.setMonth(from.getMonth() - 1); break
    case 'QUARTERLY': from.setMonth(from.getMonth() - 3); break
    case 'YEARLY': from.setFullYear(from.getFullYear() - 1); break
    default: from.setMonth(from.getMonth() - 1)
  }
  return { from, to }
}

export async function GET(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const period = request.nextUrl.searchParams.get('period') ?? 'MONTHLY'
  const format = (request.nextUrl.searchParams.get('format') ?? 'CSV').toUpperCase()
  const { from, to } = getPeriodDates(period)

  // Fetch data for export
  const invoiceItems = await prisma.invoiceItem.findMany({
    where: { invoice: { createdAt: { gte: from, lte: to } } },
    select: { itemName: true, quantity: true, unitPrice: true, total: true },
  })

  if (format === 'CSV') {
    const header = 'Nome,Quantidade,Preço Unitário,Total\n'
    const rows = invoiceItems
      .map(i => `"${i.itemName}",${i.quantity},${i.unitPrice},${i.total}`)
      .join('\n')
    const csv = header + rows
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="bi-report-${period.toLowerCase()}.csv"`,
      },
    })
  }

  // For PDF and EXCEL, return JSON with appropriate content type (mock Blob)
  const payload = {
    format,
    period,
    generatedAt: new Date().toISOString(),
    totalRows: invoiceItems.length,
    data: invoiceItems.slice(0, 100),
  }

  const contentType =
    format === 'PDF'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

  return new NextResponse(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="bi-report-${period.toLowerCase()}.${format === 'PDF' ? 'pdf' : 'xlsx'}"`,
    },
  })
}
