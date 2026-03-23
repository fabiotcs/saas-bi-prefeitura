'use client'

import { useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface BiometricCaptureProps {
  onCapture: (imageBlob: Blob) => void
  loading?: boolean
}

type CaptureStatus = 'idle' | 'requesting' | 'streaming' | 'success' | 'error'

export function BiometricCapture({ onCapture, loading = false }: BiometricCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<CaptureStatus>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')

  const startCamera = useCallback(async () => {
    setStatus('requesting')
    setErrorMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStatus('streaming')
    } catch {
      setErrorMsg('Não foi possível acessar a câmera. Verifique as permissões.')
      setStatus('error')
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const captureFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        stopCamera()
        setStatus('success')
        onCapture(blob)
      },
      'image/jpeg',
      0.9
    )
  }, [onCapture, stopCamera])

  return (
    <Card className="flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-medium text-muted-foreground">
        Verificação Biométrica Facial
      </p>

      <div className="relative w-full max-w-sm aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
        {status === 'idle' || status === 'error' ? (
          <span className="text-muted-foreground text-sm">Câmera desativada</span>
        ) : null}
        {status === 'success' ? (
          <span className="text-green-600 font-semibold">✅ Foto capturada</span>
        ) : null}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${status === 'streaming' ? 'block' : 'hidden'}`}
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {errorMsg && (
        <p className="text-sm text-destructive">{errorMsg}</p>
      )}

      <div className="flex gap-3">
        {status === 'idle' || status === 'error' ? (
          <Button onClick={startCamera} disabled={loading}>
            Ativar Câmera
          </Button>
        ) : null}
        {status === 'streaming' ? (
          <Button onClick={captureFrame} disabled={loading}>
            {loading ? 'Verificando...' : 'Verificar'}
          </Button>
        ) : null}
        {status === 'success' ? (
          <Button variant="outline" onClick={() => { setStatus('idle'); stopCamera() }}>
            Tentar novamente
          </Button>
        ) : null}
      </div>
    </Card>
  )
}
