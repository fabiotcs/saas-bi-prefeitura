import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // BrandConfig seed — Prefeitura Municipal de Araçuaí (azul institucional)
  const existingBrand = await prisma.brandConfig.findFirst()
  if (!existingBrand) {
    await prisma.brandConfig.create({
      data: {
        logoUrl: '/logo.png',
        primaryColor: '#1E40AF',
        secondaryColor: '#1E3A8A',
        faviconUrl: '/favicon.ico',
        municipalityName: 'Prefeitura Municipal de Araçuaí',
      },
    })
    console.log('Seed completed: BrandConfig criado')
  } else {
    console.log('BrandConfig já existe, pulando seed.')
  }

  const passwordHash = await bcrypt.hash('admin123', 12)

  await prisma.user.upsert({
    where: { email: 'admin@aracuai.mg.gov.br' },
    update: {},
    create: {
      fullName: 'Administrador',
      birthDate: new Date('1985-01-01'),
      phone: '(38) 99999-0000',
      email: 'admin@aracuai.mg.gov.br',
      cpf: '000.000.000-00',
      rg: '0000000',
      role: 'MAIN_MANAGER',
      biometricVerified: false,
      documentVerified: false,
      passwordHash,
    },
  })
  console.log('Seed completed: admin user created')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
