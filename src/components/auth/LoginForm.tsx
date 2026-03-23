'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BiometricCapture } from './BiometricCapture'
import { api } from '@/lib/api'

type LoginStep = 'credentials' | 'biometric'

export function LoginForm() {
  const router = useRouter()
  const [step, setStep] = useState<LoginStep>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [challengeToken, setChallengeToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
        user: { id: string; fullName: string; role: string }
      }>('/api/auth/biometric-verify', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      localStorage.setItem('access_token', data.accessToken)
      localStorage.setItem('refresh_token', data.refreshToken)
      router.push('/dashboard')
    } catch {
      setError('Verificação biométrica falhou. Tente novamente.')
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
          <BiometricCapture onCapture={handleBiometricCapture} loading={loading} />
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
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
