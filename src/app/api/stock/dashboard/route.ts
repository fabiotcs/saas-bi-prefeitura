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

  const allItems = await prisma.stockItem.findMany({
    select: { quantity: true, unitPrice: true, minimumAlert: true },
  })

  const totalProducts = allItems.length
  const totalItems = allItems.reduce((sum, i) => sum + i.quantity, 0)
  const totalValue = allItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
  const lowStockItems = allItems.filter((i) => i.quantity <= i.minimumAlert).length

  return NextResponse.json({ totalProducts, totalItems, totalValue, lowStockItems })
}
