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
  const from = sp.get('from') ? new Date(sp.get('from')!) : undefined
  const to = sp.get('to') ? new Date(sp.get('to')!) : undefined
  const secretaryId = sp.get('secretaryId') ?? undefined
  const status = sp.get('status') ?? undefined
  const productName = sp.get('productName') ?? undefined
  const userId = sp.get('userId') ?? undefined
  const sortBy = sp.get('sortBy') ?? undefined

  if (!type) {
    return NextResponse.json({ error: 'Parâmetro type é obrigatório' }, { status: 400 })
  }

  try {
    switch (type) {
      case 'ORDERS': {
        const orders = await prisma.order.findMany({
          where: {
            ...(secretaryId ? { secretaryId } : {}),
            ...(status ? { status: status as never } : {}),
            ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
          },
          include: {
            secretary: { select: { name: true } },
            createdBy: { select: { fullName: true } },
          },
          orderBy: sortBy === 'status' ? { status: 'asc' } : sortBy === 'secretary' ? { secretary: { name: 'asc' } } : { createdAt: 'desc' },
          take: 500,
        })
        return NextResponse.json({
          columns: ['Nº Pedido', 'Data', 'Solicitante', 'Fornecedor', 'Status'],
          rows: orders.map(o => ({
            'Nº Pedido': o.code,
            'Data': new Date(o.createdAt).toLocaleDateString('pt-BR'),
            'Solicitante': o.createdBy.fullName,
            'Fornecedor': o.secretary.name,
            'Status': o.status,
          })),
        })
      }

      case 'ESTABLISHMENTS': {
        const establishments = await prisma.establishment.findMany({
          where: {
            ...(status ? { status: status as never } : {}),
          },
          orderBy: sortBy === 'city' ? { city: 'asc' } : sortBy === 'state' ? { state: 'asc' } : { name: 'asc' },
          take: 500,
        })
        return NextResponse.json({
          columns: ['Nome', 'CNPJ', 'Endereço', 'Cidade', 'Estado'],
          rows: establishments.map(e => ({
            'Nome': e.name,
            'CNPJ': e.cnpj,
            'Endereço': e.address,
            'Cidade': e.city,
            'Estado': e.state,
          })),
        })
      }

      case 'PRODUCT_VALUE': {
        const items = await prisma.invoiceItem.findMany({
          where: {
            ...(productName ? { itemName: { contains: productName, mode: 'insensitive' } } : {}),
            ...(from || to ? { invoice: { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } } : {}),
          },
          select: {
            itemName: true,
            unitPrice: true,
          },
          take: 5000,
        })

        const productMap = new Map<string, { min: number; max: number; sum: number; count: number }>()
        for (const item of items) {
          const existing = productMap.get(item.itemName)
          if (existing) {
            existing.min = Math.min(existing.min, item.unitPrice)
            existing.max = Math.max(existing.max, item.unitPrice)
            existing.sum += item.unitPrice
            existing.count += 1
          } else {
            productMap.set(item.itemName, { min: item.unitPrice, max: item.unitPrice, sum: item.unitPrice, count: 1 })
          }
        }

        const rows = Array.from(productMap.entries()).map(([name, v]) => ({
          'Produto': name,
          'Mínimo': v.min.toFixed(2),
          'Médio': (v.sum / v.count).toFixed(2),
          'Máximo': v.max.toFixed(2),
        }))

        if (sortBy === 'max') rows.sort((a, b) => parseFloat(b['Máximo']) - parseFloat(a['Máximo']))
        else if (sortBy === 'min') rows.sort((a, b) => parseFloat(a['Mínimo']) - parseFloat(b['Mínimo']))
        else rows.sort((a, b) => a['Produto'].localeCompare(b['Produto']))

        return NextResponse.json({ columns: ['Produto', 'Mínimo', 'Médio', 'Máximo'], rows })
      }

      case 'EXPENSES_BY_PERIOD': {
        const invoices = await prisma.invoice.findMany({
          where: {
            ...(secretaryId ? { secretaryId } : {}),
            ...(status ? { status: status as never } : {}),
            ...(from || to ? { periodStart: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
          },
          select: {
            periodStart: true,
            totalBilled: true,
          },
          orderBy: { periodStart: 'asc' },
          take: 2000,
        })

        const periodMap = new Map<string, number>()
        for (const inv of invoices) {
          const key = new Date(inv.periodStart).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })
          periodMap.set(key, (periodMap.get(key) ?? 0) + inv.totalBilled)
        }

        const rows = Array.from(periodMap.entries()).map(([period, total]) => ({
          'Período': period,
          'Total': total.toFixed(2),
        }))

        return NextResponse.json({ columns: ['Período', 'Total'], rows })
      }

      case 'TOP_PRODUCTS': {
        const items = await prisma.invoiceItem.findMany({
          where: {
            ...(productName ? { itemName: { contains: productName, mode: 'insensitive' } } : {}),
            ...(from || to ? { invoice: { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } } : {}),
          },
          select: {
            itemName: true,
            total: true,
          },
          take: 10000,
        })

        const productMap = new Map<string, { count: number; total: number }>()
        for (const item of items) {
          const existing = productMap.get(item.itemName)
          if (existing) {
            existing.count += 1
            existing.total += item.total
          } else {
            productMap.set(item.itemName, { count: 1, total: item.total })
          }
        }

        const rows = Array.from(productMap.entries())
          .map(([name, v]) => ({
            'Produto': name,
            'Ocorrências': v.count,
            'Valor Total': v.total.toFixed(2),
          }))
          .sort((a, b) => b['Ocorrências'] - a['Ocorrências'])
          .slice(0, 20)

        return NextResponse.json({ columns: ['Produto', 'Ocorrências', 'Valor Total'], rows })
      }

      case 'OPERATIONS_LOG': {
        const logs = await prisma.auditLog.findMany({
          where: {
            ...(userId ? { userId } : {}),
            ...(from || to ? { occurredAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
          },
          include: {
            user: { select: { fullName: true } },
          },
          orderBy: { occurredAt: 'desc' },
          take: 500,
        })

        return NextResponse.json({
          columns: ['Usuário', 'Ação', 'Tipo', 'Data'],
          rows: logs.map(l => ({
            'Usuário': l.user?.fullName ?? 'Sistema',
            'Ação': l.action,
            'Tipo': l.status,
            'Data': new Date(l.occurredAt).toLocaleString('pt-BR'),
          })),
        })
      }

      default:
        return NextResponse.json({ error: `Tipo de relatório inválido: ${type}` }, { status: 400 })
    }
  } catch (error) {
    console.error('Erro ao gerar preview do relatório:', error)
    return NextResponse.json({ error: 'Erro interno ao gerar relatório' }, { status: 500 })
  }
}
