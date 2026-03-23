import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import bcrypt from 'bcrypt'
import nodemailer from 'nodemailer'
import { randomInt } from 'crypto'
import { prisma } from '@/lib/prisma'
import { TwoFactorAction } from '@prisma/client'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'changeme-super-secret-32-chars-min'
)

async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM ?? 'noreply@aracuai.mg.gov.br'

  if (!host || !user || !pass) {
    console.log(`[2FA DEV] OTP para ${to}: ${otp}`)
    return
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  await transporter.sendMail({
    from,
    to,
    subject: 'Código de confirmação — Prefeitura de Araçuaí',
    text: [
      `Seu código de confirmação é: ${otp}`,
      'Válido por 5 minutos. Não compartilhe com ninguém.',
    ].join('\n'),
    html: [
      `<p>Seu código de confirmação é: <strong>${otp}</strong></p>`,
      '<p>Válido por 5 minutos. Não compartilhe com ninguém.</p>',
    ].join(''),
  })
}

export async function POST(request: NextRequest) {
  try {
    const tokenFromCookie = request.cookies.get('access_token')?.value
    const authHeader = request.headers.get('authorization')
    const tokenFromHeader = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined
    const token = tokenFromCookie ?? tokenFromHeader

    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    let userId: string
    let userEmail: string
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      userId = payload.sub as string
      userEmail = payload.email as string
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const body = (await request.json()) as { action?: TwoFactorAction }
    const { action } = body

    const validActions = Object.values(TwoFactorAction)
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: `action inválido. Valores aceitos: ${validActions.join(', ')}` },
        { status: 400 }
      )
    }

    const otp = randomInt(100000, 999999).toString().padStart(6, '0')
    const otpHash = await bcrypt.hash(otp, 10)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    const twoFactorRequest = await prisma.twoFactorRequest.create({
      data: { userId, action, otpHash, expiresAt },
    })

    await sendOtpEmail(userEmail, otp)

    return NextResponse.json({ otpToken: twoFactorRequest.id, expiresIn: 300 })
  } catch (error) {
    console.error('POST /api/auth/2fa/request error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
