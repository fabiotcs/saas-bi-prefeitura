import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'Aberto', color: '#1d4ed8', bg: '#dbeafe' },
  IN_QUOTATION: { label: 'Em Cotação', color: '#92400e', bg: '#fef3c7' },
  APPROVED: { label: 'Aprovado', color: '#065f46', bg: '#d1fae5' },
  IN_PROGRESS: { label: 'Em Andamento', color: '#c2410c', bg: '#ffedd5' },
  COMPLETED: { label: 'Concluído', color: '#14532d', bg: '#dcfce7' },
  CANCELLED: { label: 'Cancelado', color: '#991b1b', bg: '#fee2e2' },
}

interface Props {
  id: string
  code: string
  status: string
  createdAt: string
}

export default function RecentOrderItem({ id, code, status, createdAt }: Props) {
  const config = STATUS_LABELS[status] ?? { label: status, color: '#374151', bg: '#f3f4f6' }
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(createdAt))

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={() => router.push(`/orders/${id}`)}
    >
      <Text style={styles.code}>{code}</Text>
      <View style={[styles.badge, { backgroundColor: config.bg }]}>
        <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
      </View>
      <Text style={styles.date}>{formattedDate}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 8,
  },
  pressed: {
    backgroundColor: '#f9fafb',
  },
  code: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
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
  date: {
    fontSize: 12,
    color: '#9ca3af',
    minWidth: 70,
    textAlign: 'right',
  },
})
