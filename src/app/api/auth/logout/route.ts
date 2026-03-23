import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { refreshToken?: string }
    const { refreshToken } = body

    if (!refreshToken) {
      return NextResponse.json({ error: 'refreshToken é obrigatório' }, { status: 400 })
    }

    const session = await prisma.session.findUnique({ where: { refreshToken } })
    if (!session) {
      return NextResponse.json({ message: 'Logout realizado' })
    }

    await prisma.session.delete({ where: { refreshToken } })

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    await prisma.auditLog.create({
      data: {
        action: 'AUTH_LOGOUT',
        urlPath: '/api/auth/logout',
        userId: session.userId,
        userAgent: request.headers.get('user-agent') ?? 'unknown',
        ipAddress,
        status: 'SUCCESS',
        metadata: undefined,
      },
    })

    return NextResponse.json({ message: 'Logout realizado com sucesso' })
  } catch (error) {
    console.error('Error in POST /api/auth/logout:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
