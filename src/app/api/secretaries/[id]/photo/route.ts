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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (authUser.role !== 'MAIN_MANAGER') {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const formData = await request.formData()
  const photo = formData.get('photo') as File | null

  if (!photo) return NextResponse.json({ error: 'Campo photo é obrigatório' }, { status: 400 })
  if (!photo.type.startsWith('image/')) return NextResponse.json({ error: 'Arquivo deve ser uma imagem' }, { status: 422 })

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'secretaries')
  await fs.mkdir(uploadsDir, { recursive: true })

  const ext = photo.name.split('.').pop() ?? 'jpg'
  const filename = `${params.id}-${Date.now()}.${ext}`
  const filepath = path.join(uploadsDir, filename)

  const rawBuffer = Buffer.from(await photo.arrayBuffer())
  let finalBuffer: Buffer = rawBuffer

  try {
    const sharp = (await import('sharp')).default
    const resized = await sharp(rawBuffer).resize(200, 200, { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer()
    finalBuffer = Buffer.from(resized)
  } catch {
    // sharp não disponível, salva original
  }

  await fs.writeFile(filepath, finalBuffer)
  const photoUrl = `/uploads/secretaries/${filename}`
  await prisma.secretary.update({ where: { id: params.id }, data: { photoUrl } })

  return NextResponse.json({ photoUrl })
}
