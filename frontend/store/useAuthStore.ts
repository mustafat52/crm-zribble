import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  name: string
  email: string
  roles: string[]         // array — API returns: { "roles": ["owner"] }
  business_id: string
  branch_id: string | null
  is_active?: boolean
  last_login?: string
  phone?: string | null
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  _hasHydrated: boolean
  setAuth: (token: string, user: AuthUser) => void
  clearAuth: () => void
  setHasHydrated: (val: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: (token, user) =>
        set({ token, user, isAuthenticated: true }),

      clearAuth: () =>
        set({ token: null, user: null, isAuthenticated: false }),

      setHasHydrated: (val: boolean) =>
        set({ _hasHydrated: val }),
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)