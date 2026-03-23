import { ImageResponse } from 'next/og'
import { prisma } from '@/lib/prisma'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default async function Icon() {
  let primaryColor = '#1E40AF'

  try {
    const config = await prisma.brandConfig.findFirst({
      select: { primaryColor: true },
    })
    if (config?.primaryColor) {
      primaryColor = config.primaryColor
    }
  } catch {
    // fallback to default color
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: primaryColor,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 18,
          fontWeight: 700,
          fontFamily: 'sans-serif',
        }}
      >
        P
      </div>
    ),
    { ...size }
  )
}
