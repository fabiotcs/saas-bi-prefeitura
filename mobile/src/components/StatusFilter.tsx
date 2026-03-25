import React from 'react'
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native'
import type { OrderStatus } from '../services/orders.service'

type Status = OrderStatus | 'ALL'

const STATUSES: { key: Status; label: string }[] = [
  { key: 'ALL', label: 'Todos' },
  { key: 'OPEN', label: 'Abertos' },
  { key: 'IN_QUOTATION', label: 'Em Cotação' },
  { key: 'APPROVED', label: 'Aprovados' },
  { key: 'DELIVERED', label: 'Entregues' },
  { key: 'COMPLETED', label: 'Concluídos' },
  { key: 'CANCELLED', label: 'Cancelados' },
]

interface Props {
  selected: Status
  onSelect: (status: Status) => void
}

export default function StatusFilter({ selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {STATUSES.map((s) => (
        <TouchableOpacity
          key={s.key}
          style={[styles.chip, selected === s.key && styles.chipActive]}
          onPress={() => onSelect(s.key)}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, selected === s.key && styles.chipTextActive]}>
            {s.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { maxHeight: 52, flex: 1 },
  content: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#fff' },
})
