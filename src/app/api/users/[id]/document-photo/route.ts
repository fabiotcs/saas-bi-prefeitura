import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

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

  // Só o próprio usuário ou um gestor pode enviar o documento
  const isManager = authUser.role === 'MAIN_MANAGER' || authUser.role === 'SECRETARY_MANAGER'
  if (authUser.id !== params.id && !isManager) {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } })
  if (!target) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Formulário inválido' }, { status: 400 })
  }

  const file = formData.get('document') as File | null
  if (!file) return NextResponse.json({ error: 'Campo "document" obrigatório' }, { status: 400 })

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Apenas JPEG, PNG ou WEBP são aceitos' }, { status: 422 })
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Imagem máxima: 5 MB' }, { status: 422 })
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents')
  await mkdir(uploadDir, { recursive: true })

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const filename = `${params.id}-doc-${Date.now()}.${ext}`
  const filePath = path.join(uploadDir, filename)

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filePath, buffer)

  const documentPhotoUrl = `/uploads/documents/${filename}`

  await prisma.user.update({
    where: { id: params.id },
    data: { documentPhotoUrl, documentVerified: false },
  })

  return NextResponse.json({ documentPhotoUrl })
}
