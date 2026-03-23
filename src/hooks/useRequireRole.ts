'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import type { UserRole } from '@prisma/client'

/**
 * Redireciona o usuário se seu perfil não estiver na lista de roles permitidas.
 * AUDIT_VIEWER é redirecionado para /audit/viewer após login.
 */
export function useRequireRole(allowedRoles: UserRole[], redirectTo = '/dashboard') {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!user) return
    if (!allowedRoles.includes(user.role as UserRole)) {
      router.replace(redirectTo)
    }
  }, [user, allowedRoles, redirectTo, router])

  return { user, hasAccess: user ? allowedRoles.includes(user.role as UserRole) : false }
}
