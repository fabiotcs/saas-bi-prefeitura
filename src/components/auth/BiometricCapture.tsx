'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type FraudAlertLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'

interface BiometricCaptureProps {
  onCapture: (imageBlob: Blob, motionScore: number, frameCount: number) => void
  loading?: boolean
  fraudAlertLevel?: FraudAlertLevel
}

type CaptureStatus = 'idle' | 'requesting' | 'guiding' | 'challenge' | 'capturing' | 'success' | 'error'

type LivenessChallenge = 'center' | 'blink' | 'done'

const CHALLENGE_LABELS: Record<LivenessChallenge, string> = {
  center: 'Posicione o rosto na moldura e olhe para a câmera',
  blink: 'Pisque os olhos lentamente',
  done: 'Capturando...',
}

/**
 * Calcula variância de pixels de um frame a partir do ImageData.
 * Usado para medir diferença entre frames consecutivos (motion score).
 */
function pixelVariance(data: Uint8ClampedArray): number {
  let sum = 0
  let sumSq = 0
  const step = 4 // RGBA — usa só canal R
  const len = Math.floor(data.length / step)
  for (let i = 0; i < data.length; i += step) {
    sum += data[i]
    sumSq += data[i] * data[i]
  }
  const mean = sum / len
  return sumSq / len - mean * mean
}

/**
 * Calcula diferença normalizada entre dois frames (detecção de movimento).
 * Score 0 = frames idênticos (foto/vídeo estático), 100 = muita variação (face real).
 */
function frameDiff(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let diff = 0
  const step = 8 // subsample para eficiência
  const len = Math.min(a.length, b.length)
  let count = 0
  for (let i = 0; i < len; i += step) {
    diff += Math.abs(a[i] - b[i])
    count++
  }
  if (count === 0) return 0
  const avgDiff = diff / count
  return Math.min(100, Math.round((avgDiff / 40) * 100))
}

export function BiometricCapture({
  onCapture,
  loading = false,
  fraudAlertLevel,
}: BiometricCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const framesRef = useRef<Uint8ClampedArray[]>([])
  const animFrameRef = useRef<number>(0)
  const challengeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [status, setStatus] = useState<CaptureStatus>('idle')
  const [challenge, setChallenge] = useState<LivenessChallenge>('center')
  const [countdown, setCountdown] = useState(3)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [motionScore, setMotionScore] = useState(0)

  // Desenha moldura oval guia no canvas overlay
  const drawGuideOverlay = useCallback(() => {
    const overlay = overlayCanvasRef.current
    const video = videoRef.current
    if (!overlay || !video || video.videoWidth === 0) return

    overlay.width = video.videoWidth
    overlay.height = video.videoHeight
    const ctx = overlay.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, overlay.width, overlay.height)

    // Fundo escuro semi-transparente fora da moldura
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(0, 0, overlay.width, overlay.height)

    // Oval recortada (efeito "furo")
    const cx = overlay.width / 2
    const cy = overlay.height / 2
    const rx = overlay.width * 0.32
    const ry = overlay.height * 0.45

    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()

    // Borda oval colorida
    ctx.globalCompositeOperation = 'source-over'
    const borderColor = fraudAlertLevel === 'HIGH'
      ? '#ef4444'
      : fraudAlertLevel === 'MEDIUM'
        ? '#f59e0b'
        : '#22c55e'
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    ctx.stroke()
  }, [fraudAlertLevel])

  // Loop de captura de frames para análise de movimento
  const collectFrames = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.videoWidth === 0) {
      animFrameRef.current = requestAnimationFrame(collectFrames)
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0)
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
      framesRef.current.push(frame.data.slice())
      if (framesRef.current.length > 10) framesRef.current.shift() // janela deslizante
    }

    drawGuideOverlay()
    animFrameRef.current = requestAnimationFrame(collectFrames)
  }, [drawGuideOverlay])

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current)
    if (challengeTimerRef.current) clearTimeout(challengeTimerRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    framesRef.current = []
  }, [])

  const startCamera = useCallback(async () => {
    setStatus('requesting')
    setErrorMsg('')
    setChallenge('center')
    framesRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStatus('guiding')
      animFrameRef.current = requestAnimationFrame(collectFrames)

      // Após 2s de guia, inicia desafio "piscar"
      challengeTimerRef.current = setTimeout(() => {
        setChallenge('blink')
        setStatus('challenge')

        // Após 3s no desafio, captura o frame final
        challengeTimerRef.current = setTimeout(() => {
          setChallenge('done')
          setStatus('capturing')
          captureNow()
        }, 3000)
      }, 2000)
    } catch {
      setErrorMsg('Não foi possível acessar a câmera. Verifique as permissões.')
      setStatus('error')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectFrames])

  const captureNow = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)

    // Calcula motion score a partir das diferenças entre frames coletados
    const frames = framesRef.current
    let totalDiff = 0
    let comparisons = 0
    for (let i = 1; i < frames.length; i++) {
      totalDiff += frameDiff(frames[i - 1], frames[i])
      comparisons++
    }
    const avgMotion = comparisons > 0 ? Math.round(totalDiff / comparisons) : 0
    const frameCount = frames.length
    setMotionScore(avgMotion)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        stopCamera()
        setStatus('success')
        onCapture(blob, avgMotion, frameCount)
      },
      'image/jpeg',
      0.9
    )
  }, [onCapture, stopCamera])

  // Countdown visual
  useEffect(() => {
    if (status !== 'challenge') return
    setCountdown(3)
    const interval = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(interval)
  }, [status])

  // Cleanup ao desmontar
  useEffect(() => () => stopCamera(), [stopCamera])

  const instruction = status === 'guiding' || status === 'challenge'
    ? CHALLENGE_LABELS[challenge]
    : null

  return (
    <Card className="flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-medium text-muted-foreground">Verificação Biométrica Facial</p>

      {/* Alertas de fraude */}
      {fraudAlertLevel === 'MEDIUM' && (
        <div className="w-full rounded-md bg-yellow-50 border border-yellow-200 px-4 py-2 text-sm text-yellow-800">
          ⚠️ Verificação suspeita detectada. Posicione o rosto corretamente e tente novamente.
        </div>
      )}
      {fraudAlertLevel === 'HIGH' && (
        <div className="w-full rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">
          🚫 Acesso bloqueado — fraude detectada. Contate o administrador do sistema.
        </div>
      )}

      {/* Área da câmera com overlay */}
      <div className="relative w-full max-w-sm aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
        {(status === 'idle' || status === 'error') && (
          <span className="text-muted-foreground text-sm">Câmera desativada</span>
        )}
        {status === 'success' && (
          <span className="text-green-600 font-semibold">✅ Verificação concluída</span>
        )}
        {status === 'requesting' && (
          <span className="text-muted-foreground text-sm animate-pulse">Ativando câmera...</span>
        )}

        {/* Vídeo */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${['guiding', 'challenge', 'capturing'].includes(status) ? 'block' : 'hidden'}`}
          muted
          playsInline
        />

        {/* Overlay com moldura oval */}
        <canvas
          ref={overlayCanvasRef}
          className={`absolute inset-0 w-full h-full pointer-events-none ${['guiding', 'challenge', 'capturing'].includes(status) ? 'block' : 'hidden'}`}
        />

        {/* Countdown do desafio */}
        {status === 'challenge' && countdown > 0 && (
          <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white text-sm font-bold">
            {countdown}
          </div>
        )}

        {/* Canvas oculto para captura */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Instrução de liveness */}
      {instruction && (
        <p className="text-sm text-center text-muted-foreground animate-pulse">{instruction}</p>
      )}

      {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}

      {/* Indicador de movimento (debug/qualidade) */}
      {status === 'success' && motionScore > 0 && (
        <p className="text-xs text-muted-foreground">
          Movimento detectado: {motionScore}% {motionScore >= 15 ? '✅' : '⚠️'}
        </p>
      )}

      <div className="flex gap-3">
        {(status === 'idle' || status === 'error') && (
          <Button onClick={startCamera} disabled={loading || fraudAlertLevel === 'HIGH'}>
            Ativar Câmera
          </Button>
        )}
        {status === 'success' && (
          <Button
            variant="outline"
            onClick={() => {
              setStatus('idle')
              setChallenge('center')
              setMotionScore(0)
            }}
          >
            Tentar novamente
          </Button>
        )}
        {['guiding', 'challenge', 'capturing'].includes(status) && (
          <Button variant="outline" onClick={() => { stopCamera(); setStatus('idle') }}>
            Cancelar
          </Button>
        )}
      </div>
    </Card>
  )
}
