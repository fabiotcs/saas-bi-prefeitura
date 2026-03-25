'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { listSecretaries } from '@/services/secretary.service'
import { createOrder, searchItems } from '@/services/order.service'
import type { OrderCategory, OrderItem, DeliveryLocation, ItemSearchResult } from '@/services/order.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRequireRole } from '@/hooks/useRequireRole'

interface ViaCepResponse {
  logradouro?: string
  localidade?: string
  uf?: string
  erro?: boolean
}

const CATEGORY_OPTIONS: Array<{ value: OrderCategory; label: string }> = [
  { value: 'MATERIAL', label: 'Material' },
  { value: 'SERVICE', label: 'Serviço' },
  { value: 'EQUIPMENT', label: 'Equipamento' },
]

function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebounced(value), delay)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [value, delay])

  return debounced
}

export default function NewOrderPage() {
  useRequireRole(['MAIN_MANAGER', 'SECRETARY_MANAGER'], '/dashboard')
  const router = useRouter()

  // Form state
  const [name, setName] = useState('')
  const [category, setCategory] = useState<OrderCategory>('MATERIAL')
  const [secretaryId, setSecretaryId] = useState('')
  const [subSecretaryId, setSubSecretaryId] = useState('')
  const [investmentArea, setInvestmentArea] = useState('')
  const [quotationStartDate, setQuotationStartDate] = useState('')
  const [quotationEndDate, setQuotationEndDate] = useState('')
  const [desiredDeliveryDate, setDesiredDeliveryDate] = useState('')
  const [regionRadius, setRegionRadius] = useState<string>('')
  const [specificMunicipality, setSpecificMunicipality] = useState('')
  const [receiverName, setReceiverName] = useState('')
  const [observations, setObservations] = useState('')

  // Delivery location state
  const [locName, setLocName] = useState('')
  const [locZipCode, setLocZipCode] = useState('')
  const [locAddress, setLocAddress] = useState('')
  const [locCity, setLocCity] = useState('')
  const [locState, setLocState] = useState('')
  const [deliveryLocations, setDeliveryLocations] = useState<DeliveryLocation[]>([])

  // Items state
  const [itemSearch, setItemSearch] = useState('')
  const [itemQty, setItemQty] = useState<string>('1')
  const [selectedItem, setSelectedItem] = useState<ItemSearchResult | null>(null)
  const [items, setItems] = useState<(OrderItem & { _tempId: string })[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Load secretaries
  const { data: secretariesData } = useQuery({
    queryKey: ['secretaries-all'],
    queryFn: () => listSecretaries({ limit: 100 }),
  })
  const secretaries = secretariesData?.data ?? []

  const selectedSecretary = secretaries.find((s) => s.id === secretaryId)
  const subSecretaries = selectedSecretary?.subSecretaries ?? []

  // Item autocomplete
  const debouncedItemSearch = useDebounce(itemSearch, 350)
  const { data: itemResults, isLoading: itemSearchLoading } = useQuery({
    queryKey: ['items-search', debouncedItemSearch],
    queryFn: () => searchItems(debouncedItemSearch),
    enabled: debouncedItemSearch.length >= 2,
  })
  const suggestions = itemResults?.data ?? []

  // CEP lookup
  async function handleCepBlur() {
    const cep = locZipCode.replace(/\D/g, '')
    if (cep.length !== 8) return
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const json = await res.json() as ViaCepResponse
      if (!json.erro) {
        setLocAddress(json.logradouro ?? '')
        setLocCity(json.localidade ?? '')
        setLocState(json.uf ?? '')
      }
    } catch {
      // silently ignore CEP lookup errors
    }
  }

  function addDeliveryLocation() {
    if (!locName || !locZipCode || !locAddress || !locCity || !locState) return
    setDeliveryLocations((prev) => [
      ...prev,
      { name: locName, zipCode: locZipCode, address: locAddress, city: locCity, state: locState },
    ])
    setLocName(''); setLocZipCode(''); setLocAddress(''); setLocCity(''); setLocState('')
  }

  function removeDeliveryLocation(index: number) {
    setDeliveryLocations((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSelectItem(item: ItemSearchResult) {
    setSelectedItem(item)
    setItemSearch(item.name)
    setShowSuggestions(false)
  }

  function addItem() {
    if (!selectedItem) return
    const qty = parseFloat(itemQty)
    if (!qty || qty <= 0) return
    setItems((prev) => [
      ...prev,
      {
        _tempId: `${Date.now()}-${Math.random()}`,
        name: selectedItem.name,
        imageUrl: selectedItem.imageUrl,
        unit: selectedItem.unit,
        quantity: qty,
        referenceValue: selectedItem.referenceValue,
      },
    ])
    setSelectedItem(null)
    setItemSearch('')
    setItemQty('1')
  }

  function removeItem(tempId: string) {
    setItems((prev) => prev.filter((i) => i._tempId !== tempId))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name || !category || !secretaryId || !investmentArea || !receiverName) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }
    if (items.length === 0) {
      setError('Adicione pelo menos um item.')
      return
    }
    if (deliveryLocations.length === 0) {
      setError('Adicione pelo menos um local de entrega.')
      return
    }

    setSubmitting(true)
    try {
      await createOrder({
        name,
        category,
        secretaryId,
        subSecretaryId: subSecretaryId || undefined,
        investmentArea,
        quotationStartDate: quotationStartDate || undefined,
        quotationEndDate: quotationEndDate || undefined,
        desiredDeliveryDate: desiredDeliveryDate || undefined,
        regionRadius: regionRadius ? parseInt(regionRadius) : undefined,
        specificMunicipality: specificMunicipality || undefined,
        receiverName,
        observations: observations || undefined,
        items: items.map(({ _tempId: _t, ...item }) => item),
        deliveryLocations,
      })
      router.push('/orders')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar ordem de serviço.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          ← Voltar
        </Button>
        <h1 className="text-2xl font-bold">Nova Ordem de Serviço</h1>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section: Basic Info */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Informações Básicas</h2>

          <div className="space-y-2">
            <label className="text-sm font-medium">Nome da OS *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Aquisição de material de escritório"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Categoria *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as OrderCategory)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              required
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Secretaria *</label>
              <select
                value={secretaryId}
                onChange={(e) => { setSecretaryId(e.target.value); setSubSecretaryId('') }}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                required
              >
                <option value="">Selecione...</option>
                {secretaries
                  .filter((s) => !s.parentId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Subsecretaria</label>
              <select
                value={subSecretaryId}
                onChange={(e) => setSubSecretaryId(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                disabled={subSecretaries.length === 0}
              >
                <option value="">Nenhuma</option>
                {subSecretaries.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Área de Investimento *</label>
            <Input
              value={investmentArea}
              onChange={(e) => setInvestmentArea(e.target.value)}
              placeholder="Ex: Educação, Saúde, Infraestrutura"
              required
            />
          </div>
        </section>

        {/* Section: Quotation & Delivery Dates */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Datas</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Início da Cotação</label>
              <Input
                type="date"
                value={quotationStartDate}
                onChange={(e) => setQuotationStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fim da Cotação</label>
              <Input
                type="date"
                value={quotationEndDate}
                onChange={(e) => setQuotationEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Data Desejada de Entrega</label>
            <Input
              type="date"
              value={desiredDeliveryDate}
              onChange={(e) => setDesiredDeliveryDate(e.target.value)}
            />
          </div>
        </section>

        {/* Section: Region */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Abrangência</h2>
          <p className="text-sm text-muted-foreground">
            Informe o raio de busca em km ou um município específico (alternativas).
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Raio de Busca (km)</label>
              <Input
                type="number"
                min="0"
                value={regionRadius}
                onChange={(e) => setRegionRadius(e.target.value)}
                placeholder="Ex: 50"
                disabled={!!specificMunicipality}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Município Específico</label>
              <Input
                value={specificMunicipality}
                onChange={(e) => setSpecificMunicipality(e.target.value)}
                placeholder="Ex: Araçuaí - MG"
                disabled={!!regionRadius}
              />
            </div>
          </div>
        </section>

        {/* Section: Receiver */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Recebimento</h2>

          <div className="space-y-2">
            <label className="text-sm font-medium">Responsável pelo Recebimento *</label>
            <Input
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="Nome completo do responsável"
              required
            />
          </div>
        </section>

        {/* Section: Delivery Location */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Local de Entrega</h2>

          <div className="space-y-3 p-4 border rounded-md bg-muted/30">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Local</label>
              <Input
                value={locName}
                onChange={(e) => setLocName(e.target.value)}
                placeholder="Ex: Escola Municipal João XXIII"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">CEP</label>
                <Input
                  value={locZipCode}
                  onChange={(e) => setLocZipCode(e.target.value)}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  maxLength={9}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Input
                  value={locState}
                  onChange={(e) => setLocState(e.target.value)}
                  placeholder="MG"
                  maxLength={2}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Endereço</label>
              <Input
                value={locAddress}
                onChange={(e) => setLocAddress(e.target.value)}
                placeholder="Rua, número, complemento"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cidade</label>
              <Input
                value={locCity}
                onChange={(e) => setLocCity(e.target.value)}
                placeholder="Cidade"
              />
            </div>

            <Button type="button" variant="outline" size="sm" onClick={addDeliveryLocation}>
              + Adicionar Local
            </Button>
          </div>

          {deliveryLocations.length > 0 && (
            <ul className="space-y-2">
              {deliveryLocations.map((loc, i) => (
                <li key={i} className="flex items-center justify-between p-3 border rounded-md text-sm">
                  <div>
                    <p className="font-medium">{loc.name}</p>
                    <p className="text-muted-foreground">{loc.address}, {loc.city} - {loc.state} | CEP: {loc.zipCode}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeDeliveryLocation(i)}>
                    Remover
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Section: Items */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Itens</h2>

          <div className="space-y-3 p-4 border rounded-md bg-muted/30">
            <div className="relative">
              <label className="text-sm font-medium">Buscar Item</label>
              <Input
                value={itemSearch}
                onChange={(e) => {
                  setItemSearch(e.target.value)
                  setSelectedItem(null)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Digite para buscar itens do catálogo..."
                className="mt-1"
              />
              {showSuggestions && itemSearch.length >= 2 && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {itemSearchLoading ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Buscando...</div>
                  ) : suggestions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum item encontrado.</div>
                  ) : suggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center gap-3"
                      onClick={() => handleSelectItem(item)}
                    >
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-8 h-8 rounded object-cover shrink-0"
                          style={{ width: 32, height: 32, objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-muted shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{item.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {item.category ? `${item.category} · ` : ''}{item.unit} | R$ {item.referenceValue.toFixed(2)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedItem && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
                {selectedItem.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedItem.imageUrl}
                    alt={selectedItem.name}
                    className="w-12 h-12 rounded object-cover shrink-0"
                    style={{ width: 48, height: 48, objectFit: 'cover' }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-blue-100 shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{selectedItem.name}</p>
                  <p className="text-muted-foreground">
                    {selectedItem.category ? `Categoria: ${selectedItem.category} · ` : ''}Unidade: {selectedItem.unit} | Valor ref.: R$ {selectedItem.referenceValue.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium">Qtd:</label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    className="w-20"
                  />
                </div>
                <Button type="button" size="sm" onClick={addItem}>
                  Adicionar
                </Button>
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-3 py-2 w-12">Imagem</th>
                    <th className="text-left px-3 py-2">Item</th>
                    <th className="text-left px-3 py-2">Unidade</th>
                    <th className="text-right px-3 py-2">Qtd</th>
                    <th className="text-right px-3 py-2">Valor Ref.</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr key={item._tempId}>
                      <td className="px-3 py-2">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-10 h-10 rounded object-cover"
                            style={{ width: 40, height: 40, objectFit: 'cover' }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                            —
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.unit}</td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">R$ {item.referenceValue.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item._tempId)}
                        >
                          Remover
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Section: Observations */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Observações</h2>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Informações adicionais sobre a ordem de serviço..."
            rows={4}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </section>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Criando...' : 'Criar Ordem de Serviço'}
          </Button>
        </div>
      </form>
    </div>
  )
}
