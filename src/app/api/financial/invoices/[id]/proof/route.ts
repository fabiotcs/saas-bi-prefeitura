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

  const allowedRoles = ['MAIN_MANAGER', 'SECRETARY_MANAGER']
  if (!allowedRoles.includes(authUser.role)) {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: params.id } })
  if (!invoice) return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 })

  const formData = await request.formData()
  const proof = formData.get('proof') as File | null

  if (!proof) return NextResponse.json({ error: 'Campo proof é obrigatório' }, { status: 400 })

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'proofs')
  await fs.mkdir(uploadsDir, { recursive: true })

  const ext = proof.name.split('.').pop() ?? 'pdf'
  const filename = `${params.id}-${Date.now()}.${ext}`
  const filepath = path.join(uploadsDir, filename)

  const buffer = Buffer.from(await proof.arrayBuffer())
  await fs.writeFile(filepath, buffer)

  const proofUrl = `/uploads/proofs/${filename}`
  await prisma.invoice.update({ where: { id: params.id }, data: { paymentProofUrl: proofUrl } })

  return NextResponse.json({ proofUrl })
}
