import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import path from 'path'
import fs from 'fs/promises'

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

const ALLOWED_ROLES = ['MAIN_MANAGER', 'SECRETARY_MANAGER', 'SECRETARY_USER'] as const

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (!ALLOWED_ROLES.includes(authUser.role as typeof ALLOWED_ROLES[number])) {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const order = await prisma.order.findUnique({ where: { id: params.id } })
  if (!order) return NextResponse.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 })

  const formData = await request.formData()
  const observations = formData.get('observations') as string | null

  if (!observations || observations.trim() === '') {
    return NextResponse.json({ error: 'Campo observations é obrigatório' }, { status: 422 })
  }

  const photoFiles = formData.getAll('photos') as File[]

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'non-conformities')
  await fs.mkdir(uploadsDir, { recursive: true })

  const imageUrls: string[] = []

  for (const photo of photoFiles) {
    if (!photo || typeof photo === 'string') continue

    const ext = photo.name.split('.').pop() ?? 'jpg'
    const filename = `${params.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const filepath = path.join(uploadsDir, filename)

    const rawBuffer = Buffer.from(await photo.arrayBuffer())
    let finalBuffer: Buffer = rawBuffer

    try {
      const sharp = (await import('sharp')).default
      const resized = await sharp(rawBuffer)
        .resize(800, 600, { fit: 'inside' })
        .jpeg({ quality: 85 })
        .toBuffer()
      finalBuffer = Buffer.from(resized)
    } catch {
      // sharp não disponível, salva original
    }

    await fs.writeFile(filepath, finalBuffer)
    imageUrls.push(`/uploads/non-conformities/${filename}`)
  }

  const nonConformity = await prisma.nonConformity.create({
    data: {
      orderId: params.id,
      images: imageUrls,
      registeredByUserId: authUser.id,
      registeredAt: new Date(),
      observations: observations.trim(),
    },
  })

  return NextResponse.json(nonConformity, { status: 201 })
}
