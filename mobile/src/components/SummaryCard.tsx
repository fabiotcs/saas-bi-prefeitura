import React from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'

const { width } = Dimensions.get('window')
const cardWidth = (width - 48) / 3

interface Props {
  title: string
  value: string | number
  color?: string
  icon?: string
}

export default function SummaryCard({ title, value, color = '#1a56db', icon }: Props) {
  return (
    <View style={[styles.card, { width: cardWidth }]}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={[styles.value, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 90,
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 15,
  },
})
