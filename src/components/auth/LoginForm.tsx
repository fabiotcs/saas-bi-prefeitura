'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BiometricCapture } from './BiometricCapture'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

type LoginStep = 'credentials' | 'biometric'
type FraudAlertLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'

export function LoginForm() {
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [step, setStep] = useState<LoginStep>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [challengeToken, setChallengeToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fraudAlertLevel, setFraudAlertLevel] = useState<FraudAlertLevel | undefined>()

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post<{ challengeToken: string }>('/api/auth/login', {
        email,
        password,
      })
      setChallengeToken(data.challengeToken)
      setStep('biometric')
    } catch {
      setError('E-mail ou senha inválidos.')
    } finally {
      setLoading(false)
    }
  }

  async function handleBiometricCapture(imageBlob: Blob) {
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('challengeToken', challengeToken)
      formData.append('faceImage', imageBlob, 'face.jpg')

      const { data } = await api.post<{
        accessToken: string
        refreshToken: string
        user: { id: string; fullName: string; email: string; role: string; photoUrl?: string; secretaryId?: string }
      }>('/api/auth/biometric-verify', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setAuth(data.accessToken, data.refreshToken, {
        id: data.user.id,
        fullName: data.user.fullName,
        email: data.user.email,
        role: data.user.role as 'MAIN_MANAGER' | 'SECRETARY_MANAGER' | 'SECRETARY_USER' | 'AUDIT_VIEWER',
        photoUrl: data.user.photoUrl,
        secretaryId: data.user.secretaryId,
      })
      router.push('/dashboard')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string } } }
      const status = axiosErr?.response?.status
      const errMsg = axiosErr?.response?.data?.error

      if (status === 403 && errMsg === 'fraud_detected') {
        setFraudAlertLevel('HIGH')
        setError('Acesso bloqueado — fraude detectada.')
      } else {
        setFraudAlertLevel('MEDIUM')
        setError('Verificação biométrica falhou. Tente novamente.')
      }
      setLoading(false)
    }
  }

  return (
    <div>
      {step === 'credentials' ? (
        <form onSubmit={handleCredentials} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.gov.br"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Verificando...' : 'Entrar'}
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-center text-gray-600">
            Credenciais confirmadas. Agora verifique seu rosto para acessar o sistema.
          </p>
          <BiometricCapture
            onCapture={handleBiometricCapture}
            loading={loading}
            fraudAlertLevel={fraudAlertLevel}
          />
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          {process.env.NODE_ENV === 'development' && (
            <Button
              variant="outline"
              className="w-full text-xs text-muted-foreground border-dashed"
              disabled={loading}
              onClick={async () => {
                // Pixel 1x1 JPEG branco — apenas para demonstração em dev
                const b64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8AKf/Z'
                const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
                const blob = new Blob([bytes], { type: 'image/jpeg' })
                await handleBiometricCapture(blob)
              }}
            >
              ⚡ Entrar sem câmera (modo dev)
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full text-sm"
            onClick={() => { setStep('credentials'); setError('') }}
            disabled={loading}
          >
            ← Voltar para login
          </Button>
        </div>
      )}
    </div>
  )
}
