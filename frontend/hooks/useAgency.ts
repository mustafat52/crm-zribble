import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────

export interface AgencyStats {
  total_businesses: number
  active_businesses: number
  total_leads: number
  total_users: number
  is_admin: boolean
}

export interface AgencyBusiness {
  id: string
  name: string
  slug: string
  plan: string
  is_active: boolean
  timezone: string
  created_at: string
  lead_count: number
  user_count: number
  branch_count: number
}

export interface AgencyBusinessDetail extends AgencyBusiness {
  lead_count: number
  branch_count: number
  members: AgencyMember[]
  users?: AgencyMember[]
  business?: AgencyBusiness
}

export interface AgencyMember {
  id: string
  name: string
  email: string
  roles: string[]
  is_active: boolean
  last_login_at: string | null
}

export interface AgencyStaff {
  id: string
  name: string
  email: string
  is_active: boolean
  last_login_at: string | null
  assigned_businesses: { id: string; name: string; plan: string }[]
}

// ─── Hooks ────────────────────────────────────────────────────────

export function useAgencyStats() {
  return useQuery<AgencyStats>({
    queryKey: ['agency-stats'],
    queryFn: () => api.get<AgencyStats>('/agency/stats'),
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
}

export function useAgencyBusinesses() {
  return useQuery<{ data: AgencyBusiness[] }>({
    queryKey: ['agency-businesses'],
    queryFn: () => api.get<{ data: AgencyBusiness[] }>('/agency/businesses'),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

export function useAgencyBusiness(id: string) {
  return useQuery<AgencyBusinessDetail>({
    queryKey: ['agency-business', id],
    queryFn: () => api.get<AgencyBusinessDetail>(`/agency/businesses/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useToggleBusiness() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.put(`/agency/businesses/${id}/toggle`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-businesses'] })
      qc.invalidateQueries({ queryKey: ['agency-stats'] })
    },
  })
}

// ─── Staff hooks (admin only) ─────────────────────────────────────

export function useAgencyStaff() {
  return useQuery<{ data: AgencyStaff[] }>({
    queryKey: ['agency-staff'],
    queryFn: () => api.get<{ data: AgencyStaff[] }>('/agency/staff'),
    staleTime: 30_000,
  })
}

export function useInviteStaff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { name: string; email: string }) =>
      api.post('/agency/staff', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-staff'] })
    },
  })
}

export function useAssignBusiness() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ staffId, businessId }: { staffId: string; businessId: string }) =>
      api.post(`/agency/staff/${staffId}/assign`, { business_id: businessId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-staff'] })
    },
  })
}

export function useUnassignBusiness() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ staffId, businessId }: { staffId: string; businessId: string }) =>
      api.delete(`/agency/staff/${staffId}/assign?business_id=${businessId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-staff'] })
    },
  })
}