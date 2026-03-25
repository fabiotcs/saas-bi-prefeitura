import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import { router } from 'expo-router'
import SummaryCard from '../../components/SummaryCard'
import RecentOrderItem from '../../components/RecentOrderItem'
import { getDashboardData, type MobileDashboard } from '../../services/dashboard.service'
import { getUser } from '../../services/secure-storage'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export default function HomeScreen() {
  const [data, setData] = useState<MobileDashboard | null>(null)
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const [dashboard, user] = await Promise.all([getDashboardData(), getUser()])
      setData(dashboard)
      if (user) setUserName((user as { fullName?: string; name?: string }).fullName ?? (user as { name?: string }).name ?? '')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard.')
    }
  }, [])

  useEffect(() => {
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [fetchData])

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
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.greeting}>
        {userName ? `Olá, ${userName.split(' ')[0]}! 👋` : 'Bem-vindo! 👋'}
      </Text>

      <View style={styles.cardsRow}>
        <SummaryCard
          title="Orçamento Total"
          value={data ? formatCurrency(data.totalBudget) : '-'}
          color="#1a56db"
          icon="💰"
        />
        <SummaryCard
          title="Pedidos Abertos"
          value={data?.openOrders ?? '-'}
          color="#d97706"
          icon="📋"
        />
        <SummaryCard
          title="Concluídos"
          value={data?.completedOrders ?? '-'}
          color="#059669"
          icon="✅"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pedidos Recentes</Text>
        {data?.recentOrders && data.recentOrders.length > 0 ? (
          <>
            {data.recentOrders.map((order) => (
              <RecentOrderItem
                key={order.id}
                id={order.id}
                code={order.code}
                status={order.status}
                createdAt={order.createdAt}
              />
            ))}
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push('/orders')}
            >
              <Text style={styles.viewAllText}>Ver todos os pedidos →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.emptyText}>Nenhum pedido recente.</Text>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  cardsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#1a56db',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  viewAllButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  viewAllText: {
    color: '#1a56db',
    fontSize: 14,
    fontWeight: '600',
  },
})
