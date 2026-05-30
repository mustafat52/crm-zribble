import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AgencyStats {
  total_businesses: number
  active_businesses: number
  total_leads: number
  total_users: number
}

export interface AgencyBusiness {
  id: string
  name: string
  slug: string
  plan: string
  timezone: string
  is_active: boolean
  leads_count: number
  users_count: number
  branches_count: number
  created_at: string
}

export interface AgencyBusinessDetail {
  business: AgencyBusiness
  users: Array<{
    id: string
    name: string
    email: string
    is_active: boolean
    last_login_at: string | null
    roles: Array<{ name: string }>
  }>
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useAgencyStats() {
  return useQuery<AgencyStats>({
    queryKey: ['agency', 'stats'],
    queryFn: () => api.get<AgencyStats>('/agency/stats'),
    staleTime: 60_000,
  })
}

export function useAgencyBusinesses() {
  return useQuery<{ data: AgencyBusiness[] }>({
    queryKey: ['agency', 'businesses'],
    queryFn: () => api.get<{ data: AgencyBusiness[] }>('/agency/businesses'),
    staleTime: 30_000,
  })
}

export function useAgencyBusiness(id: string) {
  return useQuery<AgencyBusinessDetail>({
    queryKey: ['agency', 'businesses', id],
    queryFn: () => api.get<AgencyBusinessDetail>(`/agency/businesses/${id}`),
    enabled: !!id,
  })
}

export function useToggleBusiness() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.put<{ id: string; is_active: boolean; message: string }>(
        `/agency/businesses/${id}/toggle`,
        {}
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency'] })
    },
  })
}