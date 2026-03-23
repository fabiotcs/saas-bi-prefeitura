import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface AuthUser {
  id: string
  fullName: string
  email: string
  role: 'MAIN_MANAGER' | 'SECRETARY_MANAGER' | 'SECRETARY_USER' | 'AUDIT_VIEWER'
  photoUrl?: string
  secretaryId?: string
}

interface AuthStore {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  setAuth: (accessToken: string, refreshToken: string, user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: (accessToken, refreshToken, user) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', accessToken)
          localStorage.setItem('refresh_token', refreshToken)
        }
        set({ accessToken, refreshToken, user })
      },
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        }
        set({ accessToken: null, refreshToken: null, user: null })
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
    }
  )
)
