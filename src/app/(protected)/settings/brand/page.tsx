'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRequireRole } from '@/hooks/useRequireRole'
import { fetchBrandConfig, updateBrandConfig } from '@/services/config.service'

export default function BrandConfigPage() {
  useRequireRole(['MAIN_MANAGER'], '/dashboard')

  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    municipalityName: '',
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '#1E40AF',
    secondaryColor: '#1E3A8A',
  })

  useEffect(() => {
    fetchBrandConfig()
      .then((config) => {
        setForm({
          municipalityName: config.municipalityName ?? '',
          logoUrl: config.logoUrl ?? '',
          faviconUrl: config.faviconUrl ?? '',
          primaryColor: config.primaryColor ?? '#1E40AF',
          secondaryColor: config.secondaryColor ?? '#1E3A8A',
        })
      })
      .catch(() => setError('Erro ao carregar configurações de marca.'))
      .finally(() => setFetching(false))
  }, [])

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)
    try {
      await updateBrandConfig(form)
      setSuccess(true)
      // Reload to apply new brand colors
      setTimeout(() => window.location.reload(), 1000)
    } catch {
      setError('Erro ao salvar configurações de marca.')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Identidade Visual</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure o logotipo, cores e nome do município exibidos no sistema
        </p>
      </div>

      {/* Preview */}
      <div className="rounded-xl border p-4 bg-muted/30">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Pré-visualização</p>
        <div
          className="rounded-lg px-4 py-3 flex items-center gap-3"
          style={{ backgroundColor: form.primaryColor }}
        >
          {form.logoUrl && form.logoUrl !== '/logo.png' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
          ) : (
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: form.secondaryColor }}
            >
              P
            </div>
          )}
          <div>
            <p className="text-white font-bold text-sm leading-tight">SaaS BI</p>
            <p className="text-white/70 text-xs">{form.municipalityName || 'Nome do Município'}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nome do Município *</label>
          <Input
            required
            value={form.municipalityName}
            onChange={(e) => set('municipalityName', e.target.value)}
            placeholder="Prefeitura Municipal de Araçuaí"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">URL do Logotipo</label>
          <Input
            value={form.logoUrl}
            onChange={(e) => set('logoUrl', e.target.value)}
            placeholder="https://exemplo.com/logo.png ou /logo.png"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Informe a URL pública da imagem. Formatos recomendados: PNG, SVG (fundo transparente).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">URL do Favicon</label>
          <Input
            value={form.faviconUrl}
            onChange={(e) => set('faviconUrl', e.target.value)}
            placeholder="/favicon.ico"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Cor Primária</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => set('primaryColor', e.target.value)}
                className="h-10 w-14 rounded border cursor-pointer"
              />
              <Input
                value={form.primaryColor}
                onChange={(e) => set('primaryColor', e.target.value)}
                placeholder="#1E40AF"
                className="font-mono"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Cor principal da barra lateral e cabeçalho</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cor Secundária</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={form.secondaryColor}
                onChange={(e) => set('secondaryColor', e.target.value)}
                className="h-10 w-14 rounded border cursor-pointer"
              />
              <Input
                value={form.secondaryColor}
                onChange={(e) => set('secondaryColor', e.target.value)}
                placeholder="#1E3A8A"
                className="font-mono"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Cor de destaque e elementos secundários</p>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && (
          <p className="text-sm text-green-600 font-medium">
            ✓ Configurações salvas! Recarregando para aplicar as alterações...
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Identidade Visual'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
