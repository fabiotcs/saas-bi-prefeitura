import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken, verifyToken } from '@/lib/jwt'
import { getBiometricProvider } from '@/lib/biometric-provider'

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const challengeToken = formData.get('challengeToken') as string | null
    const faceImage = formData.get('faceImage') as File | null

    if (!challengeToken || !faceImage) {
      return NextResponse.json(
        { error: 'challengeToken e faceImage são obrigatórios' },
        { status: 400 }
      )
    }

    // Valida challengeToken
    let userId: string
    try {
      const payload = await verifyToken(challengeToken)
      if (payload.type !== 'challenge') {
        return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
      }
      userId = payload.userId
    } catch {
      return NextResponse.json({ error: 'challengeToken inválido ou expirado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const ipAddress = getClientIp(request)
    const userAgent = request.headers.get('user-agent') ?? 'unknown'

    // Executa verificação biométrica
    const faceBuffer = Buffer.from(await faceImage.arrayBuffer())
    const provider = getBiometricProvider()
    const biometricResult = await provider.verify(faceBuffer, user.photoUrl ?? undefined)

    // Salva BiometricRecord (sempre, sucesso ou falha)
    const capturedImageUrl = `/uploads/biometric/${userId}-${Date.now()}.jpg`
    await prisma.biometricRecord.create({
      data: {
        userId,
        capturedImageUrl,
        similarityScore: biometricResult.similarityScore,
        livenessScore: biometricResult.livenessScore,
        confidenceLevel: biometricResult.confidenceLevel,
        fraudAlertLevel: biometricResult.fraudAlertLevel,
        aiEstimatedAge: biometricResult.aiEstimatedAge ?? null,
        ipAddress,
        status: biometricResult.match ? 'SUCCESS' : 'FAILED',
      },
    })

    if (!biometricResult.match) {
      await prisma.auditLog.create({
        data: {
          action: 'AUTH_BIOMETRIC_FAILED',
          urlPath: '/api/auth/biometric-verify',
          userId,
          userAgent,
          ipAddress,
          status: 'FAILED',
          metadata: { similarityScore: biometricResult.similarityScore },
        },
      })
      return NextResponse.json({ error: 'Verificação biométrica falhou' }, { status: 401 })
    }

    // Emite tokens
    const [accessToken, refreshToken] = await Promise.all([
      signToken({ userId, type: 'access' }, '15m'),
      signToken({ userId, type: 'refresh' }, '7d'),
    ])

    // Salva Session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await prisma.session.create({
      data: { userId, refreshToken, expiresAt, ipAddress, userAgent },
    })

    // Atualiza lastLogin + biometricVerified
    await prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date(), biometricVerified: true },
    })

    await prisma.auditLog.create({
      data: {
        action: 'AUTH_LOGIN_SUCCESS',
        urlPath: '/api/auth/biometric-verify',
        userId,
        userAgent,
        ipAddress,
        status: 'SUCCESS',
        metadata: { similarityScore: biometricResult.similarityScore },
      },
    })

    const { passwordHash: _, ...safeUser } = user

    return NextResponse.json({
      accessToken,
      refreshToken,
      user: { ...safeUser, biometricVerified: true },
    })
  } catch (error) {
    console.error('Error in POST /api/auth/biometric-verify:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
