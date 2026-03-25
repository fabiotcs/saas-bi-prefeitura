import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { isValidCPF } from '@/lib/cpf'
import type { UserRole } from '@prisma/client'

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

export async function GET(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (authUser.role === 'SECRETARY_USER' || authUser.role === 'AUDIT_VIEWER') {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const email = searchParams.get('email') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 50)))

  const where = {
    AND: [
      search ? { fullName: { contains: search, mode: 'insensitive' as const } } : {},
      email ? { email: { contains: email, mode: 'insensitive' as const } } : {},
      // SECRETARY_MANAGER only sees users in their own secretary
      authUser.role === 'SECRETARY_MANAGER' && authUser.secretaryId
        ? { secretaryId: authUser.secretaryId }
        : {},
    ],
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        photoUrl: true,
        lastLogin: true,
        biometricVerified: true,
        createdAt: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({ data: users, total, page, limit })
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const isMainManager = authUser.role === 'MAIN_MANAGER'
  const isSecretaryManager = authUser.role === 'SECRETARY_MANAGER'

  if (!isMainManager && !isSecretaryManager) {
    return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
  }

  const body = await request.json() as {
    fullName?: string
    birthDate?: string
    phone?: string
    email?: string
    cpf?: string
    rg?: string
    role?: UserRole
    secretaryId?: string
    password?: string
    approvalLimit?: number
  }

  let { fullName, birthDate, phone, email, cpf, rg, role, secretaryId, password } = body
  const approvalLimit = body.approvalLimit ?? 0

  // SECRETARY_MANAGER só pode criar usuários na sua própria secretaria e com roles restritas
  if (isSecretaryManager) {
    if (!authUser.secretaryId) {
      return NextResponse.json({ error: 'Gestor não está vinculado a uma secretaria' }, { status: 403 })
    }
    secretaryId = authUser.secretaryId
    if (role === 'MAIN_MANAGER' || role === 'AUDIT_VIEWER') {
      return NextResponse.json({ error: 'Não é permitido criar usuário com este perfil' }, { status: 403 })
    }
  }

  if (!fullName || !birthDate || !phone || !email || !cpf || !rg || !role) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: fullName, birthDate, phone, email, cpf, rg, role' },
      { status: 400 }
    )
  }

  if (!isValidCPF(cpf)) {
    return NextResponse.json({ error: 'CPF inválido' }, { status: 422 })
  }

  const birth = new Date(birthDate)
  const age = (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  if (isNaN(birth.getTime()) || age < 18) {
    return NextResponse.json({ error: 'Usuário deve ter no mínimo 18 anos' }, { status: 422 })
  }

  const existingEmail = await prisma.user.findUnique({ where: { email } })
  if (existingEmail) {
    return NextResponse.json({ error: 'E-mail já cadastrado no sistema' }, { status: 409 })
  }

  const existingCpf = await prisma.user.findUnique({ where: { cpf: cpf.replace(/\D/g, '') } })
  if (existingCpf) {
    return NextResponse.json({ error: 'CPF já cadastrado no sistema' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password ?? 'Mudar@123', 12)

  const user = await prisma.user.create({
    data: {
      fullName,
      birthDate: birth,
      phone,
      email,
      cpf: cpf.replace(/\D/g, ''),
      rg,
      role,
      secretaryId: secretaryId ?? null,
      passwordHash,
      approvalLimit,
    },
    select: {
      id: true, fullName: true, email: true, role: true,
      cpf: true, phone: true, createdAt: true,
    },
  })

  return NextResponse.json(user, { status: 201 })
}
