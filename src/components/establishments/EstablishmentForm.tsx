'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createEstablishment } from '@/services/establishment.service'

interface EstablishmentFormValues {
  name: string
  cnpj: string
  address: string
  city: string
  state: string
  phone: string
  email: string
  servicesDescription: string
}

interface EstablishmentFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

function formatCnpjMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

export function EstablishmentForm({ onSuccess, onCancel }: EstablishmentFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EstablishmentFormValues>()

  const cnpjValue = watch('cnpj', '')

  async function onSubmit(values: EstablishmentFormValues) {
    setSubmitting(true)
    setApiError(null)
    try {
      await createEstablishment({
        ...values,
        cnpj: values.cnpj.replace(/\D/g, ''),
      })
      onSuccess?.()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      setApiError(error?.response?.data?.error ?? 'Erro ao criar estabelecimento')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {apiError && (
        <p className="text-sm text-destructive">{apiError}</p>
      )}

      <div className="space-y-1">
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          {...register('name', { required: 'Nome obrigatório' })}
          placeholder="Nome do estabelecimento"
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="cnpj">CNPJ *</Label>
        <Input
          id="cnpj"
          value={cnpjValue}
          onChange={(e) => setValue('cnpj', formatCnpjMask(e.target.value))}
          placeholder="00.000.000/0000-00"
        />
        {errors.cnpj && <p className="text-xs text-destructive">{errors.cnpj.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="address">Endereço</Label>
        <Input
          id="address"
          {...register('address')}
          placeholder="Rua, número, complemento"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" {...register('city')} placeholder="Cidade" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="state">Estado</Label>
          <Input id="state" {...register('state')} placeholder="UF" maxLength={2} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" {...register('phone')} placeholder="(00) 00000-0000" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" {...register('email')} placeholder="contato@empresa.com" />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="servicesDescription">Descrição dos Serviços</Label>
        <Input
          id="servicesDescription"
          {...register('servicesDescription')}
          placeholder="Descreva os serviços oferecidos"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}
