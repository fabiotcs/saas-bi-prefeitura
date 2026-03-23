import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { generateOrderPdf } from '@/lib/pdf-generator'

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

const CATEGORY_LABELS: Record<string, string> = {
  MATERIAL: 'Material',
  SERVICE: 'Serviço',
  EQUIPMENT: 'Equipamento',
}


export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      secretary: { select: { id: true, name: true } },
      subSecretary: { select: { id: true, name: true } },
      createdBy: { select: { id: true, fullName: true, photoUrl: true } },
      items: true,
      timeline: {
        include: {
          user: { select: { id: true, fullName: true, photoUrl: true } },
        },
        orderBy: { occurredAt: 'asc' },
      },
      deliveryLocations: true,
      invoices: true,
    },
  })

  if (!order) {
    return NextResponse.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 })
  }

  // Build document hash (SHA-256 over stable order fields)
  const hashPayload = JSON.stringify({
    id: order.id,
    code: order.code,
    status: order.status,
    items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, referenceValue: i.referenceValue })),
  })
  const documentHash = crypto.createHash('sha256').update(hashPayload).digest('hex')

  const generatedAt = new Date()

  const pdfBuffer = await generateOrderPdf({
    code: order.code,
    status: order.status,
    category: CATEGORY_LABELS[order.category] ?? order.category,
    description: order.observations ?? order.name,
    createdAt: order.createdAt,
    secretaryName: order.secretary?.name ?? '-',
    subSecretaryName: order.subSecretary?.name ?? null,
    createdByName: order.createdBy?.fullName ?? null,
    items: order.items.map((i) => ({
      name: i.name,
      unit: i.unit,
      quantity: i.quantity,
      referenceValue: i.referenceValue,
    })),
    timeline: order.timeline.map((e) => ({
      step: e.step,
      occurredAt: e.occurredAt,
      user: e.user ? { fullName: e.user.fullName } : null,
    })),
    signerName: authUser.fullName ?? authUser.email,
    signerRole: authUser.role,
    documentHash,
    generatedAt,
  })

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="OS-${order.code}.pdf"`,
    },
  })
}
