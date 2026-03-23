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

  const sp = request.nextUrl.searchParams
  const type = sp.get('type')
  const format = (sp.get('format') ?? 'CSV').toUpperCase()
  const from = sp.get('from') ? new Date(sp.get('from')!) : undefined
  const to = sp.get('to') ? new Date(sp.get('to')!) : undefined

  if (!type) {
    return NextResponse.json({ error: 'Parâmetro type é obrigatório' }, { status: 400 })
  }

  // Fetch rows based on type
  let rows: Record<string, unknown>[] = []
  let columns: string[] = []

  if (type === 'ORDERS') {
    const orders = await prisma.order.findMany({
      where: {
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      include: {
        secretary: { select: { name: true } },
        createdBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    })
    columns = ['Nº Pedido', 'Data', 'Solicitante', 'Secretaria', 'Status']
    rows = orders.map(o => ({
      'Nº Pedido': o.code,
      'Data': new Date(o.createdAt).toLocaleDateString('pt-BR'),
      'Solicitante': o.createdBy.fullName,
      'Secretaria': o.secretary.name,
      'Status': o.status,
    }))
  } else if (type === 'ESTABLISHMENTS') {
    const establishments = await prisma.establishment.findMany({
      orderBy: { name: 'asc' },
      take: 1000,
    })
    columns = ['Nome', 'CNPJ', 'Cidade', 'Estado', 'Status']
    rows = establishments.map(e => ({
      'Nome': e.name,
      'CNPJ': e.cnpj,
      'Cidade': e.city,
      'Estado': e.state,
      'Status': e.status,
    }))
  } else {
    // For other types, return empty dataset
    columns = ['Tipo', 'Valor']
    rows = [{ 'Tipo': type, 'Valor': 'Dados não disponíveis para exportação direta' }]
  }

  if (format === 'CSV') {
    const header = columns.join(',') + '\n'
    const csvRows = rows.map(row =>
      columns.map(col => {
        const val = String(row[col] ?? '')
        return val.includes(',') ? `"${val}"` : val
      }).join(',')
    ).join('\n')
    const csv = header + csvRows

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="report-${type.toLowerCase()}.csv"`,
      },
    })
  }

  // PDF / EXCEL — return payload with appropriate content type
  const payload = {
    type,
    format,
    generatedAt: new Date().toISOString(),
    columns,
    totalRows: rows.length,
    data: rows.slice(0, 500),
  }

  const contentType =
    format === 'PDF'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

  return new NextResponse(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="report-${type.toLowerCase()}.${format === 'PDF' ? 'pdf' : 'xlsx'}"`,
    },
  })
}
