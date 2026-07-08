import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  name: string
  email: string
  roles: string[]
  business_id: string
  branch_id: string | null
  is_active?: boolean
  last_login?: string
  phone?: string | null
}

interface AuthState {
  token: string | null
  // T60: Added refresh token fields so api.ts can use them on 401
  refresh_token: string | null
  family_id: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  _hasHydrated: boolean
  setAuth: (token: string, user: AuthUser, refreshToken?: string, familyId?: string) => void
  clearAuth: () => void
  setHasHydrated: (val: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refresh_token: null,
      family_id: null,
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: (token, user, refreshToken, familyId) =>
        set({
          token,
          user,
          isAuthenticated: true,
          refresh_token: refreshToken ?? null,
          family_id: familyId ?? null,
        }),

      clearAuth: () =>
        set({
          token: null,
          refresh_token: null,
          family_id: null,
          user: null,
          isAuthenticated: false,
        }),

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
