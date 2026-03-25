import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { clearTokens, getUser } from '../../services/secure-storage'
import { mobileApi } from '../../services/api'

interface UserProfile {
  id: string
  fullName: string
  email: string
  role: string
  photoUrl?: string | null
  secretaryId?: string | null
}

const ROLE_LABELS: Record<string, string> = {
  MAIN_MANAGER: 'Gestor Principal',
  SECRETARY_MANAGER: 'Gestor de Secretaria',
  SECRETARY_USER: 'Usuário de Secretaria',
  AUDIT_VIEWER: 'Auditor',
}

function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

export default function ProfileScreen() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUser()
      .then((u) => { if (u) setUser(u as UserProfile) })
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = useCallback(() => {
    Alert.alert('Sair', 'Deseja encerrar sua sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await mobileApi.post('/api/auth/logout')
          } catch {
            // ignore
          }
          await clearTokens()
          router.replace('/(auth)/login')
        },
      },
    ])
  }, [])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a56db" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar + Name */}
      <View style={styles.profileHeader}>
        <InitialsAvatar name={user?.fullName ?? 'U'} />
        <Text style={styles.fullName}>{user?.fullName ?? '—'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {user?.role ? (ROLE_LABELS[user.role] ?? user.role) : '—'}
          </Text>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dados da Conta</Text>
        {user?.email && <InfoRow label="E-mail" value={user.email} />}
        {user?.role && <InfoRow label="Perfil" value={ROLE_LABELS[user.role] ?? user.role} />}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>

      <Text style={styles.version}>BI Araçuaí · v1.0.0</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileHeader: { alignItems: 'center', paddingTop: 32, paddingBottom: 24, gap: 10 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#1a56db',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  fullName: { fontSize: 20, fontWeight: '700', color: '#111827' },
  roleBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99 },
  roleText: { fontSize: 13, color: '#1e40af', fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  infoLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  infoValue: { fontSize: 13, color: '#111827', fontWeight: '500', flex: 1, textAlign: 'right' },
  logoutBtn: {
    marginHorizontal: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  logoutText: { color: '#dc2626', fontSize: 15, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: 12, color: '#d1d5db' },
})
