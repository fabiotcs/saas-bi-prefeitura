import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { randomBytes } from 'crypto'
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

  const where = authUser.role === 'MAIN_MANAGER' ? {} : { createdById: authUser.id }

  const apiKeys = await prisma.apiKey.findMany({
    where,
    select: {
      id: true,
      name: true,
      permissions: true,
      lastUsedAt: true,
      revoked: true,
      createdAt: true,
      createdById: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(apiKeys)
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { name, permissions = [] } = body as { name?: string; permissions?: string[] }

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json({ error: 'Campo "name" é obrigatório' }, { status: 422 })
  }

  const rawKey = randomBytes(32).toString('hex')
  const keyHash = await bcrypt.hash(rawKey, 10)

  const apiKey = await prisma.apiKey.create({
    data: {
      name: name.trim(),
      keyHash,
      permissions: Array.isArray(permissions) ? permissions : [],
      createdById: authUser.id,
    },
    select: {
      id: true,
      name: true,
      permissions: true,
      lastUsedAt: true,
      revoked: true,
      createdAt: true,
      createdById: true,
    },
  })

  return NextResponse.json({ ...apiKey, rawKey }, { status: 201 })
}
