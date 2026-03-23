import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken, verifyToken } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { refreshToken?: string }
    const { refreshToken } = body

    if (!refreshToken) {
      return NextResponse.json({ error: 'refreshToken é obrigatório' }, { status: 400 })
    }

    // Verifica JWT
    let userId: string
    try {
      const payload = await verifyToken(refreshToken)
      if (payload.type !== 'refresh') {
        return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
      }
      userId = payload.userId
    } catch {
      return NextResponse.json({ error: 'refreshToken inválido ou expirado' }, { status: 401 })
    }

    // Verifica se Session existe no banco (não revogada)
    const session = await prisma.session.findUnique({ where: { refreshToken } })
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada' }, { status: 401 })
    }

    const accessToken = await signToken({ userId, type: 'access' }, '15m')

    return NextResponse.json({ accessToken })
  } catch (error) {
    console.error('Error in POST /api/auth/refresh:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
