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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const skip = (page - 1) * limit

  const [messages, total] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { orderId: params.id },
      include: { sender: { select: { id: true, fullName: true, photoUrl: true } } },
      orderBy: { sentAt: 'asc' },
      skip,
      take: limit,
    }),
    prisma.chatMessage.count({ where: { orderId: params.id } }),
  ])

  return NextResponse.json({ data: messages, total, page, limit })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const contentType = request.headers.get('content-type') ?? ''
  let content: string | undefined
  let imageUrl: string | undefined

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    content = formData.get('content') as string | undefined
    const image = formData.get('image') as File | null

    if (image && image.type.startsWith('image/')) {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'chat')
      await fs.mkdir(uploadsDir, { recursive: true })
      const ext = image.name.split('.').pop() ?? 'jpg'
      const filename = `${params.id}-${Date.now()}.${ext}`
      const filepath = path.join(uploadsDir, filename)
      const rawBuffer = Buffer.from(await image.arrayBuffer())
      await fs.writeFile(filepath, rawBuffer)
      imageUrl = `/uploads/chat/${filename}`
    }
  } else {
    const body = await request.json() as { content?: string; senderType?: string }
    content = body.content
  }

  if (!content && !imageUrl) {
    return NextResponse.json({ error: 'Mensagem ou imagem é obrigatória' }, { status: 422 })
  }

  // Determine senderType based on role
  const senderType = authUser.role === 'AUDIT_VIEWER' ? 'ESTABLISHMENT' : 'PREFECTURE'

  const message = await prisma.chatMessage.create({
    data: {
      orderId: params.id,
      senderId: authUser.id,
      content: content ?? null,
      imageUrl: imageUrl ?? null,
      senderType,
    },
    include: { sender: { select: { id: true, fullName: true, photoUrl: true } } },
  })

  return NextResponse.json(message, { status: 201 })
}
