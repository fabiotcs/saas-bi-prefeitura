import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/jwt'

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { email?: string; password?: string }
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    const ipAddress = getClientIp(request)
    const userAgent = request.headers.get('user-agent') ?? 'unknown'

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      // Registra tentativa falha em AuditLog
      await prisma.auditLog.create({
        data: {
          action: 'AUTH_LOGIN_FAILED',
          urlPath: '/api/auth/login',
          userId: user?.id ?? null,
          userAgent,
          ipAddress,
          status: 'FAILED',
          metadata: { email },
        },
      })
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const challengeToken = await signToken(
      { userId: user.id, type: 'challenge' },
      '5m'
    )

    await prisma.auditLog.create({
      data: {
        action: 'AUTH_LOGIN_CHALLENGE',
        urlPath: '/api/auth/login',
        userId: user.id,
        userAgent,
        ipAddress,
        status: 'SUCCESS',
        metadata: { step: 'password_ok_awaiting_biometric' },
      },
    })

    return NextResponse.json({ challengeToken })
  } catch (error) {
    console.error('Error in POST /api/auth/login:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
