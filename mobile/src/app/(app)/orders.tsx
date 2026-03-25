import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import { router } from 'expo-router'
import OrderCard from '../../components/OrderCard'
import StatusFilter from '../../components/StatusFilter'
import { getOrders, type MobileOrder, type OrderStatus } from '../../services/orders.service'

type StatusFilter = OrderStatus | 'ALL'

export default function OrdersScreen() {
  const [orders, setOrders] = useState<MobileOrder[]>([])
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      setError(null)
      const result = await getOrders(status === 'ALL' ? undefined : status)
      setOrders(result)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pedidos.')
    }
  }, [status])

  useEffect(() => {
    setLoading(true)
    fetchOrders().finally(() => setLoading(false))
  }, [fetchOrders])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchOrders()
    setRefreshing(false)
  }, [fetchOrders])

  function renderContent() {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1a56db" />
        </View>
      )
    }

    if (error) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOrders}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return (
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard order={item} onPress={(id) => router.push(`/orders/${id}`)} />
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Nenhum pedido encontrado.</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={orders.length === 0 ? styles.flex1 : styles.listContent}
      />
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <StatusFilter selected={status} onSelect={setStatus} />
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/orders/new')}
          activeOpacity={0.85}
        >
          <Text style={styles.newBtnText}>+ Nova OS</Text>
        </TouchableOpacity>
      </View>
      {renderContent()}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  flex1: { flex: 1 },
  listContent: { paddingVertical: 8 },
  filterRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 12 },
  newBtn: {
    backgroundColor: '#1a56db',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginLeft: 8,
    flexShrink: 0,
  },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 15, color: '#9ca3af', textAlign: 'center' },
  errorText: { fontSize: 14, color: '#ef4444', textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: '#1a56db', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  retryText: { color: '#fff', fontWeight: '600' },
})
