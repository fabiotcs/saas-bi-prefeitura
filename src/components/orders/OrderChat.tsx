'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listMessages, sendMessage, sendImageMessage, type ChatMessage } from '@/services/chat.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface OrderChatProps {
  orderId: string
  currentUserId: string
}

export function OrderChat({ orderId, currentUserId }: OrderChatProps) {
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [imagePreview, setImagePreview] = useState<File | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data } = useQuery({
    queryKey: ['chat', orderId],
    queryFn: () => listMessages(orderId),
    refetchInterval: 3000,
  })
  const messages = useMemo(() => data?.data ?? [], [data])

  // SSE for real-time updates
  useEffect(() => {
    const token = typeof window !== 'undefined'
      ? document.cookie.match(/access_token=([^;]+)/)?.[1] : null

    const url = `/api/orders/${orderId}/chat/stream${token ? `?token=${token}` : ''}`
    const eventSource = new EventSource(url)

    eventSource.onmessage = () => {
      queryClient.invalidateQueries({ queryKey: ['chat', orderId] })
    }

    return () => eventSource.close()
  }, [orderId, queryClient])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const mutation = useMutation({
    mutationFn: async () => {
      if (imagePreview) {
        return sendImageMessage(orderId, imagePreview, text || undefined)
      }
      return sendMessage(orderId, text)
    },
    onSuccess: () => {
      setText('')
      setImagePreview(null)
      queryClient.invalidateQueries({ queryKey: ['chat', orderId] })
    },
  })

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() && !imagePreview) return
    mutation.mutate()
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setImagePreview(file)
  }

  return (
    <div className="flex flex-col h-[500px] border rounded-xl overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhuma mensagem ainda.</p>
        ) : messages.map((msg: ChatMessage) => {
          const isOwn = msg.senderId === currentUserId
          return (
            <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
              {msg.sender.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={msg.sender.photoUrl} alt={msg.sender.fullName} className="w-8 h-8 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                  {msg.sender.fullName.charAt(0)}
                </div>
              )}
              <div className={`max-w-[70%] space-y-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                <p className="text-xs text-muted-foreground">
                  {msg.sender.fullName} · {new Date(msg.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  {' · '}
                  <span className={msg.senderType === 'PREFECTURE' ? 'text-blue-600' : 'text-purple-600'}>
                    {msg.senderType === 'PREFECTURE' ? 'Prefeitura' : 'Estabelecimento'}
                  </span>
                </p>
                <div className={`rounded-xl px-3 py-2 text-sm ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {msg.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={msg.imageUrl} alt="imagem" className="max-w-[200px] rounded mb-1" />
                  )}
                  {msg.content && <p>{msg.content}</p>}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="px-4 py-2 border-t flex items-center gap-2 bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={URL.createObjectURL(imagePreview)} alt="preview" className="h-12 rounded" />
          <span className="text-xs text-muted-foreground flex-1">{imagePreview.name}</span>
          <Button variant="ghost" size="sm" onClick={() => setImagePreview(null)}>✕</Button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
        <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>📎</Button>
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Escreva uma mensagem..."
          className="flex-1"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
        />
        <Button type="submit" size="sm" disabled={mutation.isPending || (!text.trim() && !imagePreview)}>
          Enviar
        </Button>
      </form>
    </div>
  )
}
