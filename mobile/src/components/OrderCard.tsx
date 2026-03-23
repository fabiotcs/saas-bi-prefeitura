import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { MobileOrder } from '../services/orders.service'

const STATUS_CONFIG: Record<MobileOrder['status'], { label: string; color: string; bg: string }> = {
  OPEN: { label: 'Aberto', color: '#1d4ed8', bg: '#dbeafe' },
  IN_QUOTATION: { label: 'Em Cotação', color: '#92400e', bg: '#fef3c7' },
  APPROVED: { label: 'Aprovado', color: '#065f46', bg: '#d1fae5' },
  IN_PROGRESS: { label: 'Em Andamento', color: '#c2410c', bg: '#ffedd5' },
  COMPLETED: { label: 'Concluído', color: '#14532d', bg: '#dcfce7' },
  CANCELLED: { label: 'Cancelado', color: '#991b1b', bg: '#fee2e2' },
}

interface Props {
  order: MobileOrder
  onPress: (id: string) => void
}

export default function OrderCard({ order, onPress }: Props) {
  const config = STATUS_CONFIG[order.status]
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(order.createdAt))

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(order.id)} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.code}>{order.code}</Text>
        <View style={[styles.badge, { backgroundColor: config.bg }]}>
          <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
        </View>
      </View>
      <Text style={styles.description} numberOfLines={2}>
        {order.description}
      </Text>
      <View style={styles.footer}>
        <Text style={styles.secretaria}>{order.secretaria.name}</Text>
        <Text style={styles.date}>{formattedDate}</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  code: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secretaria: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
    marginRight: 8,
  },
  date: {
    fontSize: 12,
    color: '#9ca3af',
  },
})
