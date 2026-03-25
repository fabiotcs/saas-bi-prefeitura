import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { getOrderById, approveOrder, type MobileOrder, type OrderStatus } from '../../../services/orders.service'

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Rascunho', color: '#6b7280', bg: '#f3f4f6' },
  OPEN: { label: 'Aberto', color: '#1d4ed8', bg: '#dbeafe' },
  IN_QUOTATION: { label: 'Em Cotação', color: '#92400e', bg: '#fef3c7' },
  APPROVED: { label: 'Aprovado', color: '#065f46', bg: '#d1fae5' },
  DELIVERED: { label: 'Entregue', color: '#c2410c', bg: '#ffedd5' },
  COMPLETED: { label: 'Concluído', color: '#14532d', bg: '#dcfce7' },
  CANCELLED: { label: 'Cancelado', color: '#991b1b', bg: '#fee2e2' },
}

const CATEGORY_LABEL: Record<string, string> = {
  MATERIAL: 'Material',
  SERVICE: 'Serviço',
  EQUIPMENT: 'Equipamento',
}

const fmt = (d: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))

const fmtDate = (d?: string | null) =>
  d ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d)) : '—'

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [order, setOrder] = useState<MobileOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reload() {
    setLoading(true)
    getOrderById(id)
      .then(setOrder)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Erro ao carregar pedido.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [id])

  async function handleApprove() {
    Alert.alert('Aprovar Pedido', 'Confirma a aprovação deste pedido?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aprovar',
        onPress: async () => {
          setApproving(true)
          try {
            await approveOrder(id)
            Alert.alert('Sucesso', 'Pedido aprovado!')
            reload()
          } catch (err: unknown) {
            Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao aprovar pedido.')
          } finally {
            setApproving(false)
          }
        },
      },
    ])
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a56db" /></View>
  }

  if (error || !order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Pedido não encontrado.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryText}>← Voltar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const cfg = STATUS_CONFIG[order.status]
  const totalValue = (order.items ?? []).reduce((sum, i) => sum + i.referenceValue * i.quantity, 0)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.code}>{order.code}</Text>
          <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        <Text style={styles.orderName}>{order.name}</Text>
        {order.observations && <Text style={styles.observations}>{order.observations}</Text>}
      </View>

      {/* Informações */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Informações</Text>
        <InfoRow label="Categoria" value={CATEGORY_LABEL[order.category] ?? order.category} />
        <InfoRow label="Secretaria" value={order.secretary?.name ?? '—'} />
        <InfoRow label="Área de Investimento" value={order.investmentArea} />
        <InfoRow label="Responsável Recebimento" value={order.receiverName} />
        {order.desiredDeliveryDate && <InfoRow label="Entrega Desejada" value={fmtDate(order.desiredDeliveryDate)} />}
        <InfoRow label="Criado em" value={fmt(order.createdAt)} />
        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.infoLabel}>ID</Text>
          <Text style={[styles.infoValue, styles.mono]}>{order.id}</Text>
        </View>
      </View>

      {/* Itens */}
      {order.items && order.items.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Itens ({order.items.length})</Text>
          {order.items.map((item, idx) => (
            <View key={item.id ?? idx} style={[styles.itemRow, idx === (order.items!.length - 1) && { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemSub}>{item.quantity} {item.unit}</Text>
              </View>
              <Text style={styles.itemValue}>{fmtCurrency(item.referenceValue * item.quantity)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total de Referência</Text>
            <Text style={styles.totalValue}>{fmtCurrency(totalValue)}</Text>
          </View>
        </View>
      )}

      {/* Locais de Entrega */}
      {order.deliveryLocations && order.deliveryLocations.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Locais de Entrega</Text>
          {order.deliveryLocations.map((loc, idx) => (
            <View key={loc.id ?? idx} style={[styles.locRow, idx === (order.deliveryLocations!.length - 1) && { borderBottomWidth: 0 }]}>
              <Text style={styles.locName}>{loc.name}</Text>
              <Text style={styles.locAddr}>{loc.address}, {loc.city} – {loc.state}</Text>
              {loc.zipCode ? <Text style={styles.locZip}>CEP: {loc.zipCode}</Text> : null}
            </View>
          ))}
        </View>
      )}

      {/* Ação: Aprovar */}
      {order.status === 'OPEN' && (
        <TouchableOpacity
          style={[styles.approveBtn, approving && styles.approveBtnDisabled]}
          onPress={handleApprove}
          disabled={approving}
          activeOpacity={0.85}
        >
          {approving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.approveBtnText}>✓ Aprovar Pedido</Text>}
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
        <Text style={styles.backText}>← Voltar para Pedidos</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#6b7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  code: { fontSize: 18, fontWeight: '700', color: '#111827' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  orderName: { fontSize: 15, color: '#374151', lineHeight: 22 },
  observations: { fontSize: 13, color: '#9ca3af', marginTop: 6, fontStyle: 'italic' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
    gap: 8,
  },
  infoLabel: { fontSize: 13, color: '#6b7280', flex: 1 },
  infoValue: { fontSize: 13, color: '#111827', fontWeight: '500', flex: 2, textAlign: 'right' },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 11 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  itemName: { fontSize: 14, color: '#111827', fontWeight: '500' },
  itemSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  itemValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#374151' },
  totalValue: { fontSize: 16, fontWeight: '800', color: '#1a56db' },
  locRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  locName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  locAddr: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  locZip: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  approveBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  approveBtnDisabled: { opacity: 0.6 },
  approveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backRow: { paddingVertical: 8, alignItems: 'center' },
  backText: { fontSize: 14, color: '#1a56db', fontWeight: '600' },
  errorText: { fontSize: 14, color: '#ef4444', textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#1a56db', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  retryText: { color: '#fff', fontWeight: '600' },
})
