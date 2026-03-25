import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { router } from 'expo-router'
import { createOrder, searchItemsCatalog, type OrderCategory } from '../../../services/orders.service'
import { getSecretaries, type MobileSecretary } from '../../../services/secretaries.service'

type Step = 'info' | 'items' | 'delivery'

interface ItemForm {
  _key: string
  name: string
  unit: string
  quantity: string
  referenceValue: number
}

interface LocationForm {
  _key: string
  name: string
  zipCode: string
  address: string
  city: string
  state: string
}

const CATEGORIES: { value: OrderCategory; label: string }[] = [
  { value: 'MATERIAL', label: 'Material' },
  { value: 'SERVICE', label: 'Serviço' },
  { value: 'EQUIPMENT', label: 'Equipamento' },
]

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{required && <Text style={styles.required}> *</Text>}</Text>
      {children}
    </View>
  )
}

function StepIndicator({ step }: { step: Step }) {
  const steps: Step[] = ['info', 'items', 'delivery']
  const labels = ['Informações', 'Itens', 'Entrega']
  const idx = steps.indexOf(step)
  return (
    <View style={styles.stepRow}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <View style={[styles.stepDot, i <= idx && styles.stepDotActive]}>
            <Text style={[styles.stepNum, i <= idx && styles.stepNumActive]}>{i + 1}</Text>
          </View>
          {i < steps.length - 1 && <View style={[styles.stepLine, i < idx && styles.stepLineActive]} />}
        </React.Fragment>
      ))}
      <View style={styles.stepLabels}>
        {labels.map((l, i) => (
          <Text key={i} style={[styles.stepLabel, i === idx && styles.stepLabelActive]}>{l}</Text>
        ))}
      </View>
    </View>
  )
}

export default function NewOrderScreen() {
  const [step, setStep] = useState<Step>('info')
  const [submitting, setSubmitting] = useState(false)

  // Info step
  const [name, setName] = useState('')
  const [category, setCategory] = useState<OrderCategory>('MATERIAL')
  const [secretaryId, setSecretaryId] = useState('')
  const [investmentArea, setInvestmentArea] = useState('')
  const [receiverName, setReceiverName] = useState('')
  const [observations, setObservations] = useState('')
  const [secretaries, setSecretaries] = useState<MobileSecretary[]>([])
  const [secretariesLoading, setSecretariesLoading] = useState(true)

  // Items step
  const [items, setItems] = useState<ItemForm[]>([])
  const [itemSearch, setItemSearch] = useState('')
  const [itemSuggestions, setItemSuggestions] = useState<{ id: string; name: string; unit: string; referenceValue: number }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [itemName, setItemName] = useState('')
  const [itemUnit, setItemUnit] = useState('')
  const [itemQty, setItemQty] = useState('')
  const [itemRefValue, setItemRefValue] = useState('')
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Delivery step
  const [locations, setLocations] = useState<LocationForm[]>([])
  const [locName, setLocName] = useState('')
  const [locZip, setLocZip] = useState('')
  const [locAddress, setLocAddress] = useState('')
  const [locCity, setLocCity] = useState('')
  const [locState, setLocState] = useState('')

  useEffect(() => {
    getSecretaries()
      .then((list) => setSecretaries(list.filter((s) => !s.parentId)))
      .finally(() => setSecretariesLoading(false))
  }, [])

  // Item search debounce
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (itemSearch.length < 2) { setItemSuggestions([]); return }
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await searchItemsCatalog(itemSearch)
        setItemSuggestions(results)
        setShowSuggestions(true)
      } catch { /* ignore */ }
    }, 400)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [itemSearch])

  function selectSuggestion(s: { name: string; unit: string; referenceValue: number }) {
    setItemName(s.name)
    setItemUnit(s.unit)
    setItemRefValue(String(s.referenceValue))
    setItemSearch(s.name)
    setShowSuggestions(false)
  }

  function addItem() {
    if (!itemName || !itemUnit || !itemQty) {
      Alert.alert('Atenção', 'Preencha nome, unidade e quantidade do item.')
      return
    }
    setItems((prev) => [
      ...prev,
      {
        _key: `${Date.now()}`,
        name: itemName,
        unit: itemUnit,
        quantity: itemQty,
        referenceValue: parseFloat(itemRefValue) || 0,
      },
    ])
    setItemName(''); setItemUnit(''); setItemQty(''); setItemRefValue(''); setItemSearch('')
  }

  function addLocation() {
    if (!locName || !locAddress || !locCity || !locState) {
      Alert.alert('Atenção', 'Preencha nome, endereço, cidade e estado do local.')
      return
    }
    setLocations((prev) => [
      ...prev,
      { _key: `${Date.now()}`, name: locName, zipCode: locZip, address: locAddress, city: locCity, state: locState },
    ])
    setLocName(''); setLocZip(''); setLocAddress(''); setLocCity(''); setLocState('')
  }

  function validateInfo() {
    if (!name.trim()) { Alert.alert('Atenção', 'Informe o nome da ordem.'); return false }
    if (!secretaryId) { Alert.alert('Atenção', 'Selecione a secretaria.'); return false }
    if (!investmentArea.trim()) { Alert.alert('Atenção', 'Informe a área de investimento.'); return false }
    if (!receiverName.trim()) { Alert.alert('Atenção', 'Informe o responsável pelo recebimento.'); return false }
    return true
  }

  async function handleSubmit() {
    if (items.length === 0) { Alert.alert('Atenção', 'Adicione pelo menos um item.'); return }
    if (locations.length === 0) { Alert.alert('Atenção', 'Adicione pelo menos um local de entrega.'); return }

    setSubmitting(true)
    try {
      await createOrder({
        name,
        category,
        secretaryId,
        investmentArea,
        receiverName,
        observations: observations || undefined,
        items: items.map(({ _key: _, quantity, ...rest }) => ({ ...rest, quantity: parseFloat(quantity) })),
        deliveryLocations: locations.map(({ _key: _, ...rest }) => rest),
      })
      Alert.alert('Sucesso', 'Ordem de serviço criada!', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err: unknown) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao criar ordem.')
    } finally {
      setSubmitting(false)
    }
  }

  // ---- Step: Info ----
  const renderInfo = () => (
    <ScrollView contentContainerStyle={styles.stepContent}>
      <Field label="Nome da OS" required>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ex: Aquisição de material de escritório"
          placeholderTextColor="#9ca3af"
        />
      </Field>

      <Field label="Categoria" required>
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.value}
              style={[styles.chip, category === c.value && styles.chipActive]}
              onPress={() => setCategory(c.value)}
            >
              <Text style={[styles.chipText, category === c.value && styles.chipTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Field>

      <Field label="Secretaria" required>
        {secretariesLoading ? (
          <ActivityIndicator size="small" color="#1a56db" style={{ marginTop: 8 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {secretaries.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.chip, secretaryId === s.id && styles.chipActive]}
                  onPress={() => setSecretaryId(s.id)}
                >
                  <Text style={[styles.chipText, secretaryId === s.id && styles.chipTextActive]}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </Field>

      <Field label="Área de Investimento" required>
        <TextInput
          style={styles.input}
          value={investmentArea}
          onChangeText={setInvestmentArea}
          placeholder="Ex: Educação, Saúde, Infraestrutura"
          placeholderTextColor="#9ca3af"
        />
      </Field>

      <Field label="Responsável pelo Recebimento" required>
        <TextInput
          style={styles.input}
          value={receiverName}
          onChangeText={setReceiverName}
          placeholder="Nome completo"
          placeholderTextColor="#9ca3af"
        />
      </Field>

      <Field label="Observações">
        <TextInput
          style={[styles.input, styles.textarea]}
          value={observations}
          onChangeText={setObservations}
          placeholder="Informações adicionais..."
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={3}
        />
      </Field>

      <TouchableOpacity
        style={styles.nextBtn}
        onPress={() => { if (validateInfo()) setStep('items') }}
      >
        <Text style={styles.nextBtnText}>Próximo: Itens →</Text>
      </TouchableOpacity>
    </ScrollView>
  )

  // ---- Step: Items ----
  const renderItems = () => (
    <ScrollView contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
      <View style={styles.itemSearchBox}>
        <Text style={styles.label}>Buscar no catálogo</Text>
        <TextInput
          style={styles.input}
          value={itemSearch}
          onChangeText={(t) => { setItemSearch(t); setItemName(t) }}
          placeholder="Digite para buscar..."
          placeholderTextColor="#9ca3af"
        />
        {showSuggestions && itemSuggestions.length > 0 && (
          <View style={styles.suggestions}>
            {itemSuggestions.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={styles.suggestionRow}
                onPress={() => selectSuggestion(s)}
              >
                <Text style={styles.suggestionName}>{s.name}</Text>
                <Text style={styles.suggestionSub}>{s.unit} · R$ {s.referenceValue.toFixed(2)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.itemFormRow}>
        <View style={{ flex: 2 }}>
          <Text style={styles.label}>Item *</Text>
          <TextInput style={styles.input} value={itemName} onChangeText={setItemName} placeholder="Nome" placeholderTextColor="#9ca3af" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Unidade *</Text>
          <TextInput style={styles.input} value={itemUnit} onChangeText={setItemUnit} placeholder="un" placeholderTextColor="#9ca3af" />
        </View>
      </View>
      <View style={styles.itemFormRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Qtd *</Text>
          <TextInput style={styles.input} value={itemQty} onChangeText={setItemQty} placeholder="1" placeholderTextColor="#9ca3af" keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Valor Ref. (R$)</Text>
          <TextInput style={styles.input} value={itemRefValue} onChangeText={setItemRefValue} placeholder="0.00" placeholderTextColor="#9ca3af" keyboardType="decimal-pad" />
        </View>
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={addItem}>
        <Text style={styles.addBtnText}>+ Adicionar Item</Text>
      </TouchableOpacity>

      {items.length > 0 && (
        <View style={styles.addedList}>
          <Text style={styles.addedTitle}>Itens adicionados ({items.length})</Text>
          {items.map((it) => (
            <View key={it._key} style={styles.addedRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.addedName}>{it.name}</Text>
                <Text style={styles.addedSub}>{it.quantity} {it.unit} · R$ {it.referenceValue.toFixed(2)}</Text>
              </View>
              <TouchableOpacity onPress={() => setItems((prev) => prev.filter((i) => i._key !== it._key))}>
                <Text style={styles.removeText}>Remover</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.navRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep('info')}>
          <Text style={styles.backBtnText}>← Voltar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextBtn} onPress={() => {
          if (items.length === 0) { Alert.alert('Atenção', 'Adicione pelo menos um item.'); return }
          setStep('delivery')
        }}>
          <Text style={styles.nextBtnText}>Próximo: Entrega →</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )

  // ---- Step: Delivery ----
  const renderDelivery = () => (
    <ScrollView contentContainerStyle={styles.stepContent}>
      <Field label="Nome do Local" required>
        <TextInput style={styles.input} value={locName} onChangeText={setLocName} placeholder="Ex: Escola Municipal" placeholderTextColor="#9ca3af" />
      </Field>
      <View style={styles.itemFormRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>CEP</Text>
          <TextInput style={styles.input} value={locZip} onChangeText={setLocZip} placeholder="00000-000" placeholderTextColor="#9ca3af" keyboardType="number-pad" maxLength={9} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Estado *</Text>
          <TextInput style={styles.input} value={locState} onChangeText={setLocState} placeholder="MG" placeholderTextColor="#9ca3af" maxLength={2} autoCapitalize="characters" />
        </View>
      </View>
      <Field label="Endereço" required>
        <TextInput style={styles.input} value={locAddress} onChangeText={setLocAddress} placeholder="Rua, número" placeholderTextColor="#9ca3af" />
      </Field>
      <Field label="Cidade" required>
        <TextInput style={styles.input} value={locCity} onChangeText={setLocCity} placeholder="Cidade" placeholderTextColor="#9ca3af" />
      </Field>

      <TouchableOpacity style={styles.addBtn} onPress={addLocation}>
        <Text style={styles.addBtnText}>+ Adicionar Local</Text>
      </TouchableOpacity>

      {locations.length > 0 && (
        <View style={styles.addedList}>
          <Text style={styles.addedTitle}>Locais adicionados ({locations.length})</Text>
          {locations.map((loc) => (
            <View key={loc._key} style={styles.addedRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.addedName}>{loc.name}</Text>
                <Text style={styles.addedSub}>{loc.address}, {loc.city} – {loc.state}</Text>
              </View>
              <TouchableOpacity onPress={() => setLocations((prev) => prev.filter((l) => l._key !== loc._key))}>
                <Text style={styles.removeText}>Remover</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.navRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep('items')}>
          <Text style={styles.backBtnText}>← Voltar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.submitBtnText}>Criar Ordem de Serviço</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  )

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StepIndicator step={step} />
      {step === 'info' && renderInfo()}
      {step === 'items' && renderItems()}
      {step === 'delivery' && renderDelivery()}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  stepRow: { backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center' },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: '#1a56db' },
  stepNum: { fontSize: 13, fontWeight: '700', color: '#9ca3af' },
  stepNumActive: { color: '#fff' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#e5e7eb', marginHorizontal: 4 },
  stepLineActive: { backgroundColor: '#1a56db' },
  stepLabels: { position: 'absolute', bottom: -18, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  stepLabel: { fontSize: 10, color: '#9ca3af', flex: 1, textAlign: 'center' },
  stepLabelActive: { color: '#1a56db', fontWeight: '600' },
  stepContent: { padding: 16, paddingTop: 28, paddingBottom: 40 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  required: { color: '#ef4444' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
  },
  textarea: { height: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  itemSearchBox: { marginBottom: 16 },
  suggestions: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#fff', marginTop: 4, overflow: 'hidden' },
  suggestionRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  suggestionName: { fontSize: 14, color: '#111827', fontWeight: '500' },
  suggestionSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  itemFormRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  addBtn: { backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 16 },
  addBtnText: { color: '#0369a1', fontSize: 14, fontWeight: '600' },
  addedList: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden', marginBottom: 16 },
  addedTitle: { fontSize: 13, fontWeight: '600', color: '#6b7280', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  addedRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  addedName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  addedSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  removeText: { fontSize: 13, color: '#ef4444', fontWeight: '600', marginLeft: 12 },
  navRow: { flexDirection: 'row', gap: 10 },
  backBtn: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  backBtnText: { fontSize: 14, color: '#374151', fontWeight: '600' },
  nextBtn: { flex: 1, backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  submitBtn: { flex: 2, backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
})
