import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LeadStatus {
  id: string
  name: string
  color: string
  sort_order: number
  is_converted: boolean
  is_lost: boolean
  is_terminal: boolean
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  branch_id: string | null
  initials: string
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useLeadStatuses() {
  return useQuery({
    queryKey: ['lead-statuses'],
    queryFn: async () => {
      const res = await api.get<{ data: LeadStatus[] }>('/lead-statuses')
      return res.data
    },
    staleTime: 5 * 60_000, // statuses rarely change — cache 5 min
  })
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const res = await api.get<{ data: TeamMember[] }>('/team')
      return res.data
    },
    staleTime: 5 * 60_000,
  })
}