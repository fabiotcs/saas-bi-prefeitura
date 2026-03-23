import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma'

const BLOCK_FAIL_THRESHOLD = 3
const BLOCK_DURATION_MS = 5 * 60 * 1000

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { otpToken?: string; code?: string }
    const { otpToken, code } = body

    if (!otpToken || !code) {
      return NextResponse.json(
        { error: 'otpToken e code são obrigatórios' },
        { status: 400 }
      )
    }

    const record = await prisma.twoFactorRequest.findUnique({
      where: { id: otpToken },
    })

    if (!record) {
      return NextResponse.json({ valid: false, reason: 'not_found' })
    }

    const now = new Date()

    if (record.blockedUntil && record.blockedUntil > now) {
      return NextResponse.json({
        valid: false,
        reason: 'blocked',
        blockedUntil: record.blockedUntil.toISOString(),
      })
    }

    if (record.used) {
      return NextResponse.json({ valid: false, reason: 'already_used' })
    }

    if (record.expiresAt <= now) {
      return NextResponse.json({ valid: false, reason: 'expired' })
    }

    const isValid = await bcrypt.compare(code, record.otpHash)

    if (isValid) {
      await prisma.twoFactorRequest.update({
        where: { id: otpToken },
        data: { used: true },
      })
      return NextResponse.json({ valid: true })
    }

    const newFailCount = record.failCount + 1
    const shouldBlock = newFailCount >= BLOCK_FAIL_THRESHOLD

    const updatedRecord = await prisma.twoFactorRequest.update({
      where: { id: otpToken },
      data: {
        failCount: newFailCount,
        ...(shouldBlock
          ? { blockedUntil: new Date(now.getTime() + BLOCK_DURATION_MS) }
          : {}),
      },
    })

    if (shouldBlock) {
      return NextResponse.json({
        valid: false,
        reason: 'blocked',
        blockedUntil: updatedRecord.blockedUntil?.toISOString(),
      })
    }

    return NextResponse.json({ valid: false, reason: 'invalid_code' })
  } catch (error) {
    console.error('POST /api/auth/2fa/validate error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
