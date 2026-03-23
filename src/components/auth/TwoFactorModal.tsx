'use client'

import React, { useEffect, useRef, useState } from 'react'
import { TwoFactorAction } from '@prisma/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { requestTwoFactor, validateTwoFactor } from '@/services/auth.service'

const ACTION_LABELS: Record<TwoFactorAction, string> = {
  APPROVE_ORDER: 'Aprovação de Ordem de Serviço',
  SUBMIT_COMMITMENT: 'Envio de Empenho',
  SUBMIT_ADDITIVE: 'Envio de Aditivo',
}

interface TwoFactorModalProps {
  isOpen: boolean
  action: TwoFactorAction
  onSuccess: (otpToken: string, code: string) => void
  onCancel: () => void
}

const RESEND_COOLDOWN_SECONDS = 60

export function TwoFactorModal({
  isOpen,
  action,
  onSuccess,
  onCancel,
}: TwoFactorModalProps) {
  const [code, setCode] = useState('')
  const [otpToken, setOtpToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN_SECONDS)
    cooldownIntervalRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const sendOtp = async () => {
    setError(null)
    setLoading(true)
    try {
      const result = await requestTwoFactor(action)
      setOtpToken(result.otpToken)
      startCooldown()
      inputRef.current?.focus()
    } catch {
      setError('Erro ao enviar código. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setCode('')
      setError(null)
      setOtpToken(null)
      sendOtp()
    }
    return () => {
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, action])

  const handleConfirm = async () => {
    if (!otpToken || code.length !== 6) return
    setLoading(true)
    setError(null)
    try {
      const result = await validateTwoFactor(otpToken, code)
      if (result.valid) {
        onSuccess(otpToken, code)
      } else {
        if (result.reason === 'expired') {
          setError('Código expirado. Reenvie um novo código.')
        } else if (result.reason === 'blocked') {
          const until = result.blockedUntil
            ? new Date(result.blockedUntil).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : ''
          setError(`Muitas tentativas incorretas. Bloqueado até ${until}.`)
        } else if (result.reason === 'already_used') {
          setError('Este código já foi utilizado. Reenvie um novo código.')
        } else {
          setError('Código inválido. Verifique e tente novamente.')
        }
        setCode('')
        inputRef.current?.focus()
      }
    } catch {
      setError('Erro ao validar código. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && code.length === 6 && !loading) {
      handleConfirm()
    }
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(value)
  }

  const handleResend = () => {
    if (resendCooldown > 0 || loading) return
    setCode('')
    setError(null)
    sendOtp()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmação de identidade</DialogTitle>
          <DialogDescription>
            {ACTION_LABELS[action]}. Insira o código de 6 dígitos enviado ao seu
            e-mail para confirmar esta ação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            maxLength={6}
            pattern="[0-9]*"
            autoFocus
            placeholder="000000"
            value={code}
            onChange={handleCodeChange}
            onKeyDown={handleKeyDown}
            disabled={loading}
            className="text-center text-2xl tracking-widest font-mono"
          />

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="text-sm text-muted-foreground">
            Não recebeu o código?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || loading}
              className="text-primary underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
            >
              {resendCooldown > 0
                ? `Reenviar código (${resendCooldown}s)`
                : 'Reenviar código'}
            </button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || code.length !== 6 || !otpToken}
          >
            {loading ? 'Verificando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TwoFactorModal
