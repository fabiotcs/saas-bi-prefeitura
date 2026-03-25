import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import {
  getStockItems,
  getStockDashboard,
  type StockItem,
  type StockDashboard,
} from '../../services/stock.service'

const ABC_COLOR: Record<string, { bg: string; color: string }> = {
  A: { bg: '#dcfce7', color: '#14532d' },
  B: { bg: '#dbeafe', color: '#1e3a8a' },
  C: { bg: '#fef9c3', color: '#713f12' },
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function DashCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={[styles.dashCard, { borderLeftColor: color }]}>
      <Text style={styles.dashValue}>{value}</Text>
      <Text style={styles.dashLabel}>{label}</Text>
    </View>
  )
}

function ItemRow({ item }: { item: StockItem }) {
  const isLow = item.quantity <= item.minimumAlert
  const abc = item.abcClass ? ABC_COLOR[item.abcClass] : null
  return (
    <View style={[styles.itemRow, isLow && styles.itemRowLow]}>
      <View style={styles.itemMain}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemSub}>
          {item.storageLocation?.name ?? 'Sem local'} · {item.unit}
        </Text>
      </View>
      <View style={styles.itemRight}>
        <Text style={[styles.itemQty, isLow && styles.itemQtyLow]}>
          {item.quantity} {item.unit}
        </Text>
        {abc && (
          <View style={[styles.abcBadge, { backgroundColor: abc.bg }]}>
            <Text style={[styles.abcText, { color: abc.color }]}>Classe {item.abcClass}</Text>
          </View>
        )}
        {isLow && <Text style={styles.alertText}>⚠ Estoque baixo</Text>}
      </View>
    </View>
  )
}

export default function StockScreen() {
  const [dashboard, setDashboard] = useState<StockDashboard | null>(null)
  const [items, setItems] = useState<StockItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async (q?: string) => {
    try {
      setError(null)
      const [dash, its] = await Promise.all([
        getStockDashboard(),
        getStockItems(q),
      ])
      setDashboard(dash)
      setItems(its)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar estoque.')
    }
  }, [])

  useEffect(() => {
    fetchAll().finally(() => setLoading(false))
  }, [fetchAll])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchAll(search)
    setRefreshing(false)
  }, [fetchAll, search])

  useEffect(() => {
    const t = setTimeout(() => {
      fetchAll(search)
    }, 400)
    return () => clearTimeout(t)
  }, [search, fetchAll])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a56db" />
      </View>
    )
  }

  const ListHeader = (
    <View>
      {dashboard && (
        <View style={styles.dashRow}>
          <DashCard label="Total Itens" value={dashboard.totalItems} color="#1a56db" />
          <DashCard label="Estoque Baixo" value={dashboard.lowStockCount} color="#ef4444" />
          <DashCard label="Valor Total" value={formatCurrency(dashboard.totalValue)} color="#059669" />
        </View>
      )}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar item..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>
      <Text style={styles.sectionTitle}>Itens ({items.length})</Text>
    </View>
  )

  return (
    <FlatList
      data={items}
      keyExtractor={(it) => it.id}
      renderItem={({ item }) => <ItemRow item={item} />}
      ListHeaderComponent={ListHeader}
      ListEmptyComponent={
        !loading ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {error ?? 'Nenhum item encontrado.'}
            </Text>
            {error && (
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchAll(search)}>
                <Text style={styles.retryText}>Tentar novamente</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      style={styles.container}
      contentContainerStyle={styles.listContent}
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  listContent: { paddingBottom: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, minHeight: 200 },
  dashRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  dashCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  dashValue: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  dashLabel: { fontSize: 11, color: '#6b7280' },
  searchBox: { marginHorizontal: 16, marginVertical: 8 },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#6b7280', paddingHorizontal: 16, paddingBottom: 6 },
  itemRow: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemRowLow: { borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  itemMain: { flex: 1, marginRight: 12 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 3 },
  itemSub: { fontSize: 12, color: '#9ca3af' },
  itemRight: { alignItems: 'flex-end', gap: 4 },
  itemQty: { fontSize: 15, fontWeight: '700', color: '#111827' },
  itemQtyLow: { color: '#ef4444' },
  abcBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  abcText: { fontSize: 11, fontWeight: '600' },
  alertText: { fontSize: 11, color: '#ef4444', fontWeight: '500' },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  retryBtn: { marginTop: 12, backgroundColor: '#1a56db', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  retryText: { color: '#fff', fontWeight: '600' },
})
