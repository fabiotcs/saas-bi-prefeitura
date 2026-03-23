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

const ITEM_CATALOG = [
  { id: '1', name: 'Papel A4 (resma 500 folhas)', unit: 'resma', referenceValue: 25.90, imageUrl: null },
  { id: '2', name: 'Caneta Esferográfica Azul', unit: 'caixa c/50', referenceValue: 18.50, imageUrl: null },
  { id: '3', name: 'Toner para Impressora HP LaserJet', unit: 'unidade', referenceValue: 180.00, imageUrl: null },
  { id: '4', name: 'Cadeira Ergonômica de Escritório', unit: 'unidade', referenceValue: 650.00, imageUrl: null },
  { id: '5', name: 'Mesa de Escritório 1,20m', unit: 'unidade', referenceValue: 420.00, imageUrl: null },
  { id: '6', name: 'Computador Desktop Core i5', unit: 'unidade', referenceValue: 2800.00, imageUrl: null },
  { id: '7', name: 'Monitor LED 21"', unit: 'unidade', referenceValue: 750.00, imageUrl: null },
  { id: '8', name: 'Clipes para papel (caixa)', unit: 'caixa', referenceValue: 3.90, imageUrl: null },
  { id: '9', name: 'Envelope A4 pardo (100 unidades)', unit: 'pacote', referenceValue: 28.00, imageUrl: null },
  { id: '10', name: 'Gasolina Comum', unit: 'litro', referenceValue: 5.89, imageUrl: null },
  { id: '11', name: 'Álcool em Gel 70% (1L)', unit: 'unidade', referenceValue: 12.50, imageUrl: null },
  { id: '12', name: 'Caixa de Arquivo Morto', unit: 'unidade', referenceValue: 8.90, imageUrl: null },
]

export async function GET(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const q = (searchParams.get('q') ?? '').toLowerCase().trim()

  const data = q
    ? ITEM_CATALOG.filter((item) => item.name.toLowerCase().includes(q))
    : ITEM_CATALOG

  return NextResponse.json({ data })
}
