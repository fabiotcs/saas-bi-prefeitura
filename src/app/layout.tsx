import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/providers/query-provider'
import { BrandProvider } from '@/providers/brand-provider'
import { prisma } from '@/lib/prisma'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SaaS BI — Prefeitura de Araçuaí/MG',
  description: 'Sistema de Gestão de Compras, Estoque e Auditoria — Pregão 008/2026',
}

async function getBrandConfig() {
  try {
    const config = await prisma.brandConfig.findFirst()
    return config
  } catch {
    return null
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const brandConfig = await getBrandConfig()

  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <QueryProvider>
          <BrandProvider config={brandConfig}>
            {children}
          </BrandProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
