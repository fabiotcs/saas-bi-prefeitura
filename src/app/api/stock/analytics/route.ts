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
    case 'ANNUAL': from.setFullYear(from.getFullYear() - 1); break
    default: from.setMonth(from.getMonth() - 1)
  }
  return { from, to }
}

function calculateAbcClass(rank: number, total: number): 'A' | 'B' | 'C' {
  const pct = rank / total
  if (pct <= 0.8) return 'A'
  if (pct <= 0.95) return 'B'
  return 'C'
}

export async function GET(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const period = request.nextUrl.searchParams.get('period') ?? 'MONTHLY'
  const { from, to } = getPeriodDates(period)

  // Buscar movimentações do período
  const movements = await prisma.stockMovement.findMany({
    where: { occurredAt: { gte: from, lte: to } },
    include: { item: { select: { id: true, name: true, unit: true } } },
  })

  // Top 10 mais movimentados por quantidade
  const movementMap = new Map<string, { name: string; total: number; value: number }>()
  for (const m of movements) {
    const existing = movementMap.get(m.itemId) ?? { name: m.item.name, total: 0, value: 0 }
    movementMap.set(m.itemId, {
      name: existing.name,
      total: existing.total + m.quantity,
      value: existing.value + m.value,
    })
  }
  const topMovedItems = Array.from(movementMap.entries())
    .map(([id, v]) => ({ id, name: v.name, quantity: v.total, value: v.value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  // Itens sem movimentação no período
  const movedItemIds = new Set(movements.map(m => m.itemId))
  const allItems = await prisma.stockItem.findMany({ select: { id: true, name: true, quantity: true, unitPrice: true, unit: true } })
  const zeroMovementItems = allItems.filter(i => !movedItemIds.has(i.id))
  const frozenStockValue = zeroMovementItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)

  // Curva ABC — por valor acumulado de movimentações
  const itemsByValue = Array.from(movementMap.entries())
    .map(([id, v]) => ({ id, name: v.name, value: v.value }))
    .sort((a, b) => b.value - a.value)
  const totalValue = itemsByValue.reduce((sum, i) => sum + i.value, 0)

  let cumulative = 0
  const abcItems = itemsByValue.map((item, index) => {
    const before = totalValue > 0 ? cumulative / totalValue : 0
    cumulative += item.value
    const cls = before < 0.8 ? 'A' : before < 0.95 ? 'B' : 'C'
    return { ...item, abcClass: cls as 'A' | 'B' | 'C', rank: index + 1 }
  })

  // Atualizar abcClass no banco (batch)
  const updates = abcItems.slice(0, 50).map(item =>
    prisma.stockItem.update({ where: { id: item.id }, data: { abcClass: item.abcClass } })
  )
  await Promise.allSettled(updates)

  const abcDistribution = {
    A: abcItems.filter(i => i.abcClass === 'A').length,
    B: abcItems.filter(i => i.abcClass === 'B').length,
    C: abcItems.filter(i => i.abcClass === 'C').length,
  }

  // Movimentações atípicas (desvio > 2σ)
  const quantities = movements.map(m => m.quantity)
  const mean = quantities.length ? quantities.reduce((a, b) => a + b, 0) / quantities.length : 0
  const variance = quantities.length
    ? quantities.reduce((sum, q) => sum + Math.pow(q - mean, 2), 0) / quantities.length
    : 0
  const stdDev = Math.sqrt(variance)
  const atypicalMovements = movements
    .filter(m => Math.abs(m.quantity - mean) > 2 * stdDev)
    .slice(0, 10)
    .map(m => ({ id: m.id, item: m.item.name, quantity: m.quantity, occurredAt: m.occurredAt }))

  // Recomendações automáticas
  const recommendations: string[] = []
  const lowStockItems = allItems.filter(i => i.quantity <= 0)
  if (lowStockItems.length > 0) {
    recommendations.push(`${lowStockItems.length} itens com estoque zerado necessitam reposição imediata.`)
  }
  if (frozenStockValue > 0) {
    recommendations.push(`R$ ${frozenStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em estoque parado — considere redistribuição entre secretarias.`)
  }
  if (abcDistribution.A > 0) {
    recommendations.push(`Priorize os ${abcDistribution.A} itens da Curva A (80% do valor) para negociações com fornecedores.`)
  }
  if (atypicalMovements.length > 0) {
    recommendations.push(`${atypicalMovements.length} movimentações atípicas detectadas — verifique possíveis erros de registro.`)
  }

  return NextResponse.json({
    period,
    topMovedItems,
    zeroMovementItems: zeroMovementItems.slice(0, 20),
    frozenStockValue,
    atypicalMovements,
    abcDistribution,
    abcItems: abcItems.slice(0, 20),
    recommendations,
  })
}
