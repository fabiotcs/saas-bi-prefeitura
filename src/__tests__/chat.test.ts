import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    chatMessage: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}))

vi.mock('fs/promises', () => ({
  default: { mkdir: vi.fn().mockResolvedValue(undefined), writeFile: vi.fn().mockResolvedValue(undefined) },
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { GET as chatGET, POST as chatPOST } from '@/app/api/orders/[id]/chat/route'

const baseUser = {
  id: 'user-1', email: 'user@test.com', role: 'SECRETARY_USER',
  passwordHash: 'hash', fullName: 'Usuário', secretaryId: null,
  biometricVerified: false, documentVerified: false,
  birthDate: new Date(), phone: '', cpf: '', rg: '',
  photoUrl: null, lastLogin: null, createdAt: new Date(), updatedAt: new Date(),
}

const mockMessage = {
  id: 'msg-1', orderId: 'order-1', senderId: 'user-1',
  content: 'Olá', imageUrl: null, senderType: 'PREFECTURE', sentAt: new Date(),
  sender: { id: 'user-1', fullName: 'Usuário', photoUrl: null },
}

describe('GET /api/orders/:id/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(baseUser as never)
    vi.mocked(prisma.chatMessage.findMany).mockResolvedValue([mockMessage] as never)
    vi.mocked(prisma.chatMessage.count).mockResolvedValue(1)
  })

  it('retorna 401 sem autenticação', async () => {
    vi.mocked(verifyToken).mockRejectedValue(new Error('invalid'))
    const req = new NextRequest('http://localhost/api/orders/order-1/chat')
    const res = await chatGET(req, { params: { id: 'order-1' } })
    expect(res.status).toBe(401)
  })

  it('retorna 200 com lista de mensagens', async () => {
    const req = new NextRequest('http://localhost/api/orders/order-1/chat', {
      headers: { Authorization: 'Bearer valid.token' },
    })
    const res = await chatGET(req, { params: { id: 'order-1' } })
    expect(res.status).toBe(200)
    const data = await res.json() as { data: unknown[]; total: number }
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.total).toBe(1)
  })
})

describe('POST /api/orders/:id/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'user-1', type: 'access' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(baseUser as never)
    vi.mocked(prisma.chatMessage.create).mockResolvedValue(mockMessage as never)
  })

  it('retorna 401 sem autenticação', async () => {
    vi.mocked(verifyToken).mockRejectedValue(new Error('invalid'))
    const req = new NextRequest('http://localhost/api/orders/order-1/chat', {
      method: 'POST',
      body: JSON.stringify({ content: 'Olá' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await chatPOST(req, { params: { id: 'order-1' } })
    expect(res.status).toBe(401)
  })

  it('retorna 422 sem conteúdo nem imagem', async () => {
    const req = new NextRequest('http://localhost/api/orders/order-1/chat', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid.token' },
    })
    const res = await chatPOST(req, { params: { id: 'order-1' } })
    expect(res.status).toBe(422)
  })

  it('retorna 201 com mensagem válida', async () => {
    const req = new NextRequest('http://localhost/api/orders/order-1/chat', {
      method: 'POST',
      body: JSON.stringify({ content: 'Olá, tudo bem?' }),
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid.token' },
    })
    const res = await chatPOST(req, { params: { id: 'order-1' } })
    expect(res.status).toBe(201)
  })
})
