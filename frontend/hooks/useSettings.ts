import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BusinessSettings {
  id: string
  name: string
  slug: string
  whatsapp_number: string | null
  whatsapp_provider: string
  timezone: string
  plan: string
  features: Record<string, boolean>
  settings: Record<string, unknown>
  duplicate_handling: 'merge' | 'new'
  is_active: boolean
}

export interface BusinessUpdatePayload {
  name?: string
  timezone?: string
  whatsapp_number?: string | null
  duplicate_handling?: 'merge' | 'new'
}

export interface LeadStatus {
  id: string
  business_id: string
  name: string
  color: string
  sort_order: number
  is_converted: boolean
  is_lost: boolean
  is_terminal: boolean
}

export interface LeadStatusPayload {
  name: string
  color: string
  is_converted?: boolean
  is_lost?: boolean
  is_terminal?: boolean
  sort_order?: number
}

export interface TeamMember {
  id: string
  name: string
  email: string
  roles: string[]
  branch_id: string | null
  branch: { id: string; name: string } | null
  is_active: boolean
  initials: string
}

export interface InvitePayload {
  name: string
  email: string
  role: string
  branch_id: string
}

export interface TeamUpdatePayload {
  role?: string
  branch_id?: string
  is_active?: boolean
}

export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  is_active: boolean
  last_used_at: string | null
  expires_at: string | null
  created_at: string
}

export interface ApiKeyCreateResponse {
  key: ApiKey
  raw_key: string
  warning: string
}

// ---------------------------------------------------------------------------
// Business
// ---------------------------------------------------------------------------

export function useBusiness() {
  return useQuery<BusinessSettings>({
    queryKey: ['business'],
    queryFn:  () => api.get<BusinessSettings>('/business'),
    staleTime: 60_000,
  })
}

export function useUpdateBusiness() {
  const qc = useQueryClient()
  return useMutation<BusinessSettings, Error, BusinessUpdatePayload>({
    mutationFn: (payload) => api.put<BusinessSettings>('/business', payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['business'] }),
  })
}

// ---------------------------------------------------------------------------
// Lead Statuses
// ---------------------------------------------------------------------------

export function useLeadStatusesSettings() {
  return useQuery<LeadStatus[]>({
    queryKey: ['lead-statuses-settings'],
    queryFn:  () => api.get<LeadStatus[]>('/lead-statuses'),
    staleTime: 30_000,
  })
}

export function useCreateLeadStatus() {
  const qc = useQueryClient()
  return useMutation<LeadStatus, Error, LeadStatusPayload>({
    mutationFn: (payload) => api.post<LeadStatus>('/lead-statuses', payload),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['lead-statuses-settings'] })
      qc.invalidateQueries({ queryKey: ['lead-statuses'] }) // invalidate dropdown cache too
    },
  })
}

export function useUpdateLeadStatus() {
  const qc = useQueryClient()
  return useMutation<LeadStatus, Error, { id: string; payload: Partial<LeadStatusPayload> }>({
    mutationFn: ({ id, payload }) => api.put<LeadStatus>(`/lead-statuses/${id}`, payload),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['lead-statuses-settings'] })
      qc.invalidateQueries({ queryKey: ['lead-statuses'] })
    },
  })
}

export function useDeleteLeadStatus() {
  const qc = useQueryClient()
  return useMutation<{ message: string }, Error, string>({
    mutationFn: (id) => api.delete<{ message: string }>(`/lead-statuses/${id}`),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['lead-statuses-settings'] })
      qc.invalidateQueries({ queryKey: ['lead-statuses'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

export function useTeamSettings() {
  return useQuery<{ data: TeamMember[] }>({
    queryKey: ['team-settings'],
    queryFn:  () => api.get<{ data: TeamMember[] }>('/team'),
    staleTime: 30_000,
  })
}

export function useInviteTeamMember() {
  const qc = useQueryClient()
  return useMutation<{ user: TeamMember; temp_password: string; message: string }, Error, InvitePayload>({
    mutationFn: (payload) => api.post('/team/invite', payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['team-settings'] }),
  })
}

export function useUpdateTeamMember() {
  const qc = useQueryClient()
  return useMutation<TeamMember, Error, { id: string; payload: TeamUpdatePayload }>({
    mutationFn: ({ id, payload }) => api.put<TeamMember>(`/team/${id}`, payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['team-settings'] }),
  })
}

export function useDeactivateTeamMember() {
  const qc = useQueryClient()
  return useMutation<{ message: string }, Error, string>({
    mutationFn: (id) => api.delete<{ message: string }>(`/team/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['team-settings'] }),
  })
}

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------

export function useApiKeys() {
  return useQuery<ApiKey[]>({
    queryKey: ['api-keys'],
    queryFn:  () => api.get<ApiKey[]>('/api-keys'),
    staleTime: 30_000,
  })
}

export function useCreateApiKey() {
  const qc = useQueryClient()
  return useMutation<ApiKeyCreateResponse, Error, { name: string }>({
    mutationFn: (payload) => api.post<ApiKeyCreateResponse>('/api-keys', payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['api-keys'] }),
  })
}

export function useRevokeApiKey() {
  const qc = useQueryClient()
  return useMutation<{ message: string }, Error, string>({
    mutationFn: (id) => api.delete<{ message: string }>(`/api-keys/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['api-keys'] }),
  })
}