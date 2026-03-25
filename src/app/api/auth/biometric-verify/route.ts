import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { signToken, verifyToken } from '@/lib/jwt'
import { getBiometricProvider } from '@/lib/biometric-provider'
import { mailer, FROM_ADDRESS, buildFraudAlertEmailHtml } from '@/lib/mailer'

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

async function loadDocumentBuffer(documentPhotoUrl: string | null): Promise<Buffer | undefined> {
  if (!documentPhotoUrl) return undefined
  try {
    const filePath = path.join(process.cwd(), 'public', documentPhotoUrl)
    return await readFile(filePath)
  } catch {
    return undefined
  }
}

async function notifyManagersOfFraud(
  userId: string,
  userName: string,
  userEmail: string,
  fraudLevel: 'MEDIUM' | 'HIGH',
  data: {
    livenessScore: number
    similarityScore: number
    aiEstimatedAge?: number
    aiEstimatedGender?: string
    documentMatch: boolean
    ipAddress: string
  }
) {
  try {
    const managers = await prisma.user.findMany({
      where: { role: { in: ['MAIN_MANAGER', 'SECRETARY_MANAGER'] } },
      select: { fullName: true, email: true },
    })

    const occurredAt = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date())

    await Promise.allSettled(
      managers.map((m) =>
        mailer.sendMail({
          from: FROM_ADDRESS,
          to: m.email,
          subject: `${fraudLevel === 'HIGH' ? '🚨 ALERTA FRAUDE' : '⚠️ Inconsistência'} Biométrica — ${userName}`,
          html: buildFraudAlertEmailHtml({
            userName,
            userEmail,
            fraudLevel,
            livenessScore: data.livenessScore,
            similarityScore: data.similarityScore,
            aiEstimatedAge: data.aiEstimatedAge,
            aiEstimatedGender: data.aiEstimatedGender,
            documentMatch: data.documentMatch,
            ipAddress: data.ipAddress,
            occurredAt,
            recipientName: m.fullName,
            recipientEmail: m.email,
          }),
        }).catch((err) => console.warn(`Falha ao enviar alerta para ${m.email}:`, err))
      )
    )
  } catch (err) {
    console.warn('Erro ao notificar gestores:', err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const challengeToken = formData.get('challengeToken') as string | null
    const faceImage = formData.get('faceImage') as File | null
    const motionScoreRaw = formData.get('motionScore')
    const frameCountRaw = formData.get('frameCount')
    const motionScore = motionScoreRaw ? Number(motionScoreRaw) : undefined
    const frameCount = frameCountRaw ? Number(frameCountRaw) : undefined

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

    // Carrega buffer do documento se disponível
    const documentBuffer = await loadDocumentBuffer(user.documentPhotoUrl ?? null)

    // Executa verificação biométrica com análise de documento, IA e liveness multi-frame
    const faceBuffer = Buffer.from(await faceImage.arrayBuffer())
    const provider = getBiometricProvider()
    const biometricResult = await provider.verify(
      faceBuffer,
      user.photoUrl ?? undefined,
      documentBuffer,
      { motionScore, frameCount }
    )

    // Salva BiometricRecord (sempre, sucesso ou falha)
    const capturedImageUrl = `/uploads/biometric/${userId}-${Date.now()}.jpg`
    await prisma.biometricRecord.create({
      data: {
        userId,
        capturedImageUrl,
        documentPhotoUrl: user.documentPhotoUrl ?? null,
        similarityScore: biometricResult.similarityScore,
        livenessScore: biometricResult.livenessScore,
        confidenceLevel: biometricResult.confidenceLevel,
        fraudAlertLevel: biometricResult.fraudAlertLevel,
        aiEstimatedAge: biometricResult.aiEstimatedAge ?? null,
        aiEstimatedGender: biometricResult.aiEstimatedGender ?? null,
        documentMatch: biometricResult.documentMatch,
        ipAddress,
        status: biometricResult.fraudAlertLevel === 'HIGH'
          ? 'SUSPICIOUS'
          : biometricResult.match ? 'SUCCESS' : 'FAILED',
      },
    })

    // Notificar gestores se fraude HIGH ou MEDIUM
    if (biometricResult.fraudAlertLevel === 'HIGH' || biometricResult.fraudAlertLevel === 'MEDIUM') {
      await notifyManagersOfFraud(
        userId,
        user.fullName,
        user.email,
        biometricResult.fraudAlertLevel,
        {
          livenessScore: biometricResult.livenessScore,
          similarityScore: biometricResult.similarityScore,
          aiEstimatedAge: biometricResult.aiEstimatedAge,
          aiEstimatedGender: biometricResult.aiEstimatedGender,
          documentMatch: biometricResult.documentMatch,
          ipAddress,
        }
      )
    }

    // Bloqueia acesso se fraude detectada (HIGH ou MEDIUM) — edital: "suspeita de fraude bloqueia acesso"
    if (biometricResult.fraudAlertLevel === 'HIGH' || biometricResult.fraudAlertLevel === 'MEDIUM') {
      await prisma.auditLog.create({
        data: {
          action: 'AUTH_BIOMETRIC_FRAUD_DETECTED',
          urlPath: '/api/auth/biometric-verify',
          userId,
          userAgent,
          ipAddress,
          status: 'SUSPICIOUS',
          metadata: {
            livenessScore: biometricResult.livenessScore,
            fraudAlertLevel: biometricResult.fraudAlertLevel,
            aiEstimatedAge: biometricResult.aiEstimatedAge,
            aiEstimatedGender: biometricResult.aiEstimatedGender,
            motionScore,
            frameCount,
          },
        },
      })
      return NextResponse.json({ error: 'fraud_detected' }, { status: 403 })
    }

    if (!biometricResult.match) {
      await prisma.auditLog.create({
        data: {
          action: 'AUTH_BIOMETRIC_FAILED',
          urlPath: '/api/auth/biometric-verify',
          userId,
          userAgent,
          ipAddress,
          status: 'FAILED',
          metadata: {
            similarityScore: biometricResult.similarityScore,
            fraudAlertLevel: biometricResult.fraudAlertLevel,
          },
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

    // Atualiza lastLogin + biometricVerified + documentVerified (se documento foi comparado)
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastLogin: new Date(),
        biometricVerified: true,
        ...(documentBuffer && { documentVerified: biometricResult.documentMatch }),
      },
    })

    await prisma.auditLog.create({
      data: {
        action: 'AUTH_LOGIN_SUCCESS',
        urlPath: '/api/auth/biometric-verify',
        userId,
        userAgent,
        ipAddress,
        status: 'SUCCESS',
        metadata: {
          similarityScore: biometricResult.similarityScore,
          aiEstimatedAge: biometricResult.aiEstimatedAge,
          aiEstimatedGender: biometricResult.aiEstimatedGender,
          documentMatch: biometricResult.documentMatch,
          motionScore,
          frameCount,
        },
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
