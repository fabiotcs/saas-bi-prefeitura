'use client'

import Link from 'next/link'
import { useRequireRole } from '@/hooks/useRequireRole'

export default function AuditViewerPage() {
  useRequireRole(['AUDIT_VIEWER', 'MAIN_MANAGER'], '/dashboard')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Painel de Auditoria</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acesso restrito — TCE/MP
          </p>
        </div>

        <nav className="space-y-3">
          <Link
            href="/audit/biometric"
            className="flex items-center gap-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl">🔒</span>
            <div>
              <p className="font-medium">Histórico Biométrico</p>
              <p className="text-xs text-muted-foreground">Autenticações e tentativas de acesso</p>
            </div>
          </Link>

          <Link
            href="/audit/logs"
            className="flex items-center gap-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl">📋</span>
            <div>
              <p className="font-medium">Logs de Auditoria</p>
              <p className="text-xs text-muted-foreground">Todas as ações do sistema</p>
            </div>
          </Link>
        </nav>
      </div>
    </div>
  )
}
