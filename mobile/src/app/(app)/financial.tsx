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
import {
  getFinancialSummary,
  getInvoices,
  type Invoice,
  type FinancialSummary,
  type InvoiceStatus,
} from '../../services/financial.service'

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pendente', color: '#92400e', bg: '#fef3c7' },
  PARTIALLY_PAID: { label: 'Parcial', color: '#1e40af', bg: '#dbeafe' },
  PAID: { label: 'Pago', color: '#065f46', bg: '#d1fae5' },
  OVERDUE: { label: 'Vencido', color: '#991b1b', bg: '#fee2e2' },
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const formatDate = (d?: string | null) =>
  d
    ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))
    : '—'

function SummaryBar({ summary }: { summary: FinancialSummary }) {
  const pct = summary.totalBudget > 0
    ? Math.min(100, (summary.committed / summary.totalBudget) * 100)
    : 0

  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Resumo Orçamentário</Text>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{formatCurrency(summary.totalBudget)}</Text>
          <Text style={styles.summaryLabel}>Orçamento Total</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#d97706' }]}>{formatCurrency(summary.committed)}</Text>
          <Text style={styles.summaryLabel}>Comprometido</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#059669' }]}>{formatCurrency(summary.available)}</Text>
          <Text style={styles.summaryLabel}>Disponível</Text>
        </View>
      </View>
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${pct}%` as unknown as number }]} />
      </View>
      <Text style={styles.progressLabel}>{pct.toFixed(1)}% comprometido</Text>
      {(summary.overdueInvoices > 0 || summary.pendingInvoices > 0) && (
        <View style={styles.alertsRow}>
          {summary.pendingInvoices > 0 && (
            <View style={[styles.alertChip, { backgroundColor: '#fef3c7' }]}>
              <Text style={[styles.alertChipText, { color: '#92400e' }]}>
                {summary.pendingInvoices} pendente{summary.pendingInvoices > 1 ? 's' : ''}
              </Text>
            </View>
          )}
          {summary.overdueInvoices > 0 && (
            <View style={[styles.alertChip, { backgroundColor: '#fee2e2' }]}>
              <Text style={[styles.alertChipText, { color: '#991b1b' }]}>
                {summary.overdueInvoices} vencida{summary.overdueInvoices > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const cfg = STATUS_CONFIG[invoice.status]
  return (
    <View style={[styles.invoiceRow, invoice.status === 'OVERDUE' && styles.invoiceRowOverdue]}>
      <View style={styles.invoiceMain}>
        <Text style={styles.invoiceSecretary} numberOfLines={1}>
          {invoice.secretary?.name ?? 'Secretaria'}
        </Text>
        <Text style={styles.invoiceDate}>Venc.: {formatDate(invoice.dueDate)}</Text>
        {invoice.referenceMonth && (
          <Text style={styles.invoiceRef}>Ref.: {invoice.referenceMonth}</Text>
        )}
      </View>
      <View style={styles.invoiceRight}>
        <Text style={styles.invoiceAmount}>{formatCurrency(invoice.totalAmount)}</Text>
        {invoice.paidAmount > 0 && invoice.status !== 'PAID' && (
          <Text style={styles.invoicePaid}>Pago: {formatCurrency(invoice.paidAmount)}</Text>
        )}
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
    </View>
  )
}

export default function FinancialScreen() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    try {
      setError(null)
      const [s, inv] = await Promise.all([getFinancialSummary(), getInvoices()])
      setSummary(s)
      setInvoices(inv)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar financeiro.')
    }
  }, [])

  useEffect(() => {
    fetchAll().finally(() => setLoading(false))
  }, [fetchAll])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchAll()
    setRefreshing(false)
  }, [fetchAll])

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
        <TouchableOpacity style={styles.retryBtn} onPress={fetchAll}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <FlatList
      data={invoices}
      keyExtractor={(inv) => inv.id}
      renderItem={({ item }) => <InvoiceRow invoice={item} />}
      ListHeaderComponent={
        <View>
          {summary && <SummaryBar summary={summary} />}
          <Text style={styles.sectionTitle}>Invoices ({invoices.length})</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>Nenhuma invoice encontrada.</Text>
        </View>
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
  summaryCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 14 },
  summaryRow: { flexDirection: 'row', marginBottom: 14 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  summaryLabel: { fontSize: 11, color: '#6b7280', marginTop: 2, textAlign: 'center' },
  progressBg: { height: 8, backgroundColor: '#f3f4f6', borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: '#1a56db', borderRadius: 99 },
  progressLabel: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  alertsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  alertChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  alertChipText: { fontSize: 12, fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#6b7280', paddingHorizontal: 16, paddingBottom: 6 },
  invoiceRow: {
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
  invoiceRowOverdue: { borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  invoiceMain: { flex: 1, marginRight: 12 },
  invoiceSecretary: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 3 },
  invoiceDate: { fontSize: 12, color: '#6b7280' },
  invoiceRef: { fontSize: 12, color: '#9ca3af' },
  invoiceRight: { alignItems: 'flex-end', gap: 4 },
  invoiceAmount: { fontSize: 15, fontWeight: '700', color: '#111827' },
  invoicePaid: { fontSize: 11, color: '#059669' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  statusText: { fontSize: 11, fontWeight: '600' },
  errorText: { fontSize: 14, color: '#ef4444', textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#1a56db', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  retryText: { color: '#fff', fontWeight: '600' },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
})
