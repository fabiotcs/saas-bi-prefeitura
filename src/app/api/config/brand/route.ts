import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    let config = await prisma.brandConfig.findFirst()
    if (!config) {
      config = await prisma.brandConfig.create({
        data: {
          logoUrl: '/logo.png',
          primaryColor: '#1E40AF',
          secondaryColor: '#1E3A8A',
          faviconUrl: '/favicon.ico',
          municipalityName: 'Prefeitura Municipal de Araçuaí',
        },
      })
    }
    return NextResponse.json(config)
  } catch (error) {
    console.error('GET /api/config/brand error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body: Partial<{
      logoUrl: string
      primaryColor: string
      secondaryColor: string
      faviconUrl: string
      municipalityName: string
    }> = await request.json()

    let config = await prisma.brandConfig.findFirst()
    if (!config) {
      config = await prisma.brandConfig.create({
        data: {
          logoUrl: body.logoUrl ?? '/logo.png',
          primaryColor: body.primaryColor ?? '#1E40AF',
          secondaryColor: body.secondaryColor ?? '#1E3A8A',
          faviconUrl: body.faviconUrl ?? '/favicon.ico',
          municipalityName: body.municipalityName ?? 'Prefeitura Municipal de Araçuaí',
        },
      })
    } else {
      config = await prisma.brandConfig.update({
        where: { id: config.id },
        data: body,
      })
    }
    return NextResponse.json(config)
  } catch (error) {
    console.error('PATCH /api/config/brand error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
