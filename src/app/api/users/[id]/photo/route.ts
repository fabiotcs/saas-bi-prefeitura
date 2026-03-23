import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import path from 'path'
import fs from 'fs/promises'

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return null
  try {
    const payload = await verifyToken(token)
    if (payload.type !== 'access') return null
    return await prisma.user.findUnique({ where: { id: payload.userId } })
  } catch {
    return null
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (authUser.role !== 'MAIN_MANAGER' && authUser.id !== params.id) {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const formData = await request.formData()
  const photo = formData.get('photo') as File | null

  if (!photo) {
    return NextResponse.json({ error: 'Campo photo é obrigatório' }, { status: 400 })
  }

  if (!photo.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Arquivo deve ser uma imagem' }, { status: 422 })
  }

  // Salva em public/uploads/avatars/ (PoC — produção: S3)
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')
  await fs.mkdir(uploadsDir, { recursive: true })

  const ext = photo.name.split('.').pop() ?? 'jpg'
  const filename = `${params.id}-${Date.now()}.${ext}`
  const filepath = path.join(uploadsDir, filename)

  const rawBuffer = Buffer.from(await photo.arrayBuffer())
  let finalBuffer: Buffer = rawBuffer

  // Tenta redimensionar com sharp (opcional — não falha se indisponível)
  try {
    const sharp = (await import('sharp')).default
    const resized = await sharp(rawBuffer).resize(200, 200, { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer()
    finalBuffer = Buffer.from(resized)
  } catch {
    // sharp não disponível, salva original
  }

  await fs.writeFile(filepath, finalBuffer)

  const photoUrl = `/uploads/avatars/${filename}`
  await prisma.user.update({ where: { id: params.id }, data: { photoUrl } })

  return NextResponse.json({ photoUrl })
}
