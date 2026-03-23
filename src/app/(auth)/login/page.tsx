import { prisma } from '@/lib/prisma'

async function getBrandConfig() {
  try {
    return await prisma.brandConfig.findFirst()
  } catch {
    return null
  }
}

export default async function LoginPage() {
  const brand = await getBrandConfig()

  const municipalityName = brand?.municipalityName ?? 'Prefeitura Municipal de Araçuaí'

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: `var(--primary, #1E40AF)` }}
    >
      <div className="w-full max-w-md mx-auto px-4">
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          {/* Logo area */}
          <div className="flex flex-col items-center mb-8">
            {brand?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logoUrl}
                alt={`Logo ${municipalityName}`}
                className="h-16 w-auto object-contain mb-4"
              />
            ) : (
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4"
                style={{ background: `var(--primary, #1E40AF)` }}
              >
                P
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-900 text-center">
              SaaS BI Araçuaí
            </h1>
            <p className="text-sm text-gray-500 text-center mt-1">
              {municipalityName}
            </p>
          </div>

          {/* Placeholder — full form implemented in Story 1.4 */}
          <div className="text-center text-gray-400 text-sm py-4 border border-dashed border-gray-200 rounded-lg">
            Formulário de autenticação — implementado na Story 1.4
          </div>
        </div>
      </div>
    </div>
  )
}
