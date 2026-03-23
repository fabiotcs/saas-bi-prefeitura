import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'changeme-super-secret-32-chars-min'
)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get token from cookie or Authorization header
  const tokenFromCookie = request.cookies.get('access_token')?.value
  const authHeader = request.headers.get('authorization')
  const tokenFromHeader = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : undefined

  const token = tokenFromCookie ?? tokenFromHeader

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    await jwtVerify(token, JWT_SECRET)
    return NextResponse.next()
  } catch {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    const response = NextResponse.redirect(loginUrl)
    // Clear invalid cookie
    response.cookies.delete('access_token')
    return response
  }
}

export const config = {
  matcher: ['/(protected)/(.*)'],
}
