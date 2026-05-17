import { create } from 'zustand'

interface StoreState {
  role: 'agency' | 'client'
  screen: string
  selectedClientId: string | null
  selectedLead: any | null
  alertScreen: string | null
  attentionScreen: string | null
  toastMessage: string | null
  toastTimer: ReturnType<typeof setTimeout> | null
  switchRole: () => void
  setScreen: (screen: string) => void
  openClient: (id: string) => void
  openLead: (lead: any) => void
  openAlert: (screen: string) => void
  openAttention: (screen: string) => void
  goBack: () => void
  showToast: (message: string) => void
}

export const useStore = create<StoreState>((set, get) => ({
  role: 'agency',
  screen: 'dashboard',
  selectedClientId: null,
  selectedLead: null,
  alertScreen: null,
  attentionScreen: null,
  toastMessage: null,
  toastTimer: null,

  switchRole: () => set(s => {
    const newRole = s.role === 'agency' ? 'client' : 'agency'
    return {
      role: newRole,
      screen: 'dashboard',
      selectedClientId: newRole === 'client' ? 'adsync' : null,
      selectedLead: null,
      alertScreen: null,
      attentionScreen: null,
    }
  }),

  setScreen: (screen) => set({ screen, alertScreen: null, attentionScreen: null }),

  openClient: (id) => set({
    selectedClientId: id,
    screen: 'pipeline',
    selectedLead: null,
    alertScreen: null,
    attentionScreen: null,
  }),

  openLead: (lead) => set({ selectedLead: lead, screen: 'lead-detail' }),

  openAlert: (screen) => set({ alertScreen: screen, screen: 'alert-detail' }),

  openAttention: (screen) => set({ attentionScreen: screen, screen: 'attention-detail' }),

  goBack: () => set(s => {
    if (s.screen === 'lead-detail') return { screen: 'pipeline', selectedLead: null }
    if (s.screen === 'alert-detail' || s.screen === 'attention-detail') {
      return { screen: 'dashboard', alertScreen: null, attentionScreen: null }
    }
    if (s.screen === 'pipeline' && s.role === 'agency') {
      return { screen: 'dashboard', selectedClientId: null }
    }
    return { screen: 'dashboard' }
  }),

  showToast: (message) => {
    const { toastTimer } = get()
    if (toastTimer) clearTimeout(toastTimer)
    const timer = setTimeout(() => set({ toastMessage: null, toastTimer: null }), 2800)
    set({ toastMessage: message, toastTimer: timer })
  },
}))