import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'

async function getAuthenticatedUser(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    ?? new URL(request.url).searchParams.get('token')
  if (!token) return null
  try {
    const payload = await verifyToken(token)
    if (payload.type !== 'access') return null
    return await prisma.user.findUnique({ where: { id: payload.userId } })
  } catch {
    return null
  }
}

// SSE stream for real-time chat
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return new Response('Unauthorized', { status: 401 })
  }

  let lastId = 0
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      // Send initial keepalive
      controller.enqueue(encoder.encode(': keepalive\n\n'))

      async function poll() {
        if (closed) return
        try {
          const messages = await prisma.chatMessage.findMany({
            where: { orderId: params.id },
            include: { sender: { select: { id: true, fullName: true, photoUrl: true } } },
            orderBy: { sentAt: 'asc' },
            ...(lastId > 0 ? { skip: lastId } : {}),
            take: 10,
          })

          for (const msg of messages) {
            lastId++
            const data = `data: ${JSON.stringify(msg)}\n\n`
            controller.enqueue(encoder.encode(data))
          }
        } catch {
          // ignore polling errors
        }

        if (!closed) {
          setTimeout(poll, 2000)
        }
      }

      await poll()
    },
    cancel() {
      closed = true
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
