'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building2,
  Users,
  ShoppingCart,
  ClipboardList,
  DollarSign,
  Package,
  BarChart3,
  ScanFace,
  Palette,
  Settings,
  LogOut,
  X,
  UserCircle,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import type { UserRole } from '@/types'

const ROLE_LABELS: Record<string, string> = {
  MAIN_MANAGER: 'Gestor Principal',
  SECRETARY_MANAGER: 'Gestor de Secretaria',
  SECRETARY_USER: 'Usuário de Secretaria',
  AUDIT_VIEWER: 'Auditor',
}

interface NavLink {
  href: string
  label: string
  icon: React.ElementType
  allowedRoles?: UserRole[]
}

const navLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/secretaries', label: 'Secretarias', icon: Building2 },
  { href: '/users', label: 'Usuários', icon: Users },
  { href: '/orders', label: 'Pedidos', icon: ShoppingCart },
  { href: '/audit', label: 'Auditoria', icon: ClipboardList },
  {
    href: '/audit/biometric',
    label: 'Histórico Biométrico',
    icon: ScanFace,
    allowedRoles: ['MAIN_MANAGER', 'AUDIT_VIEWER'],
  },
  { href: '/budget', label: 'Orçamento', icon: DollarSign },
  { href: '/stock', label: 'Estoque', icon: Package },
  { href: '/reports', label: 'Relatórios', icon: BarChart3 },
  {
    href: '/settings',
    label: 'Configurações',
    icon: Settings,
    allowedRoles: ['MAIN_MANAGER'],
  },
  {
    href: '/settings/brand',
    label: 'Identidade Visual',
    icon: Palette,
    allowedRoles: ['MAIN_MANAGER'],
  },
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  function handleLogout() {
    logout()
    router.push('/login')
  }

  const initials = user?.fullName
    ? user.fullName.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : '?'

  const visibleLinks = navLinks.filter(({ allowedRoles }) => {
    if (!allowedRoles) return true
    return user?.role && allowedRoles.includes(user.role as UserRole)
  })

  return (
    <aside className="flex h-full flex-col bg-primary text-primary-foreground w-64">
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
        <div>
          <h2 className="font-bold text-lg leading-tight">SaaS BI</h2>
          <p className="text-xs text-white/70 mt-0.5">Prefeitura de Araçuaí</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded hover:bg-white/10 transition-colors"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Usuário logado */}
      {user && (
        <div className="border-t border-white/10 px-3 py-3">
          <Link
            href="/profile"
            onClick={onClose}
            className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 transition-colors group"
          >
            <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.fullName}</p>
              <p className="text-xs text-white/60 truncate">{ROLE_LABELS[user.role] ?? user.role}</p>
            </div>
            <UserCircle className="h-4 w-4 text-white/40 group-hover:text-white/80 shrink-0 transition-colors" />
          </Link>
          <button
            onClick={handleLogout}
            className="mt-1 w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sair
          </button>
        </div>
      )}
    </aside>
  )
}
