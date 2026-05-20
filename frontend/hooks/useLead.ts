import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Activity {
  id: string
  type:
    | 'created'
    | 'status_changed'
    | 'assignment'
    | 'note'
    | 'call_log'
    | 'followup_set'
    | 'whatsapp_sent'
    | 'email_sent'
    | 'duplicate_merged'
  description: string
  user_id: string | null
  user_name?: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface LeadDetail {
  id: string
  business_id: string
  branch_id: string | null
  assigned_to: string | null
  assigned_user?: { id: string; name: string; initials: string } | null
  lead_status_id: string
  status?: { id: string; name: string; color: string }
  name: string
  mobile: string
  email: string | null
  source: string
  campaign: string | null
  city: string | null
  interested_in: string | null
  lead_value: number | null
  tags: string[]
  custom_fields: Record<string, unknown>
  metadata: Record<string, unknown>
  next_followup_at: string | null
  last_contacted_at: string | null
  converted_at: string | null
  lost_reason: string | null
  duplicate_of: string | null
  is_duplicate: boolean
  activities: Activity[]
  created_at: string
  updated_at: string
}

// ── Query key factory ─────────────────────────────────────────────────────────

export const leadKeys = {
  detail: (id: string) => ['lead', id] as const,
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useLead(id: string) {
  return useQuery({
    queryKey: leadKeys.detail(id),
    queryFn: async () => {
      const res = await api.get<LeadDetail>(`/leads/${id}`)
      return res
    },
    enabled: Boolean(id),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

// ── Mutation hooks ────────────────────────────────────────────────────────────

export function useChangeStatus(leadId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { lead_status_id: string; reason?: string }) =>
      api.put(`/leads/${leadId}/status`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: leadKeys.detail(leadId) }),
  })
}

export function useAssignLead(leadId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { user_id: string | null }) =>
      api.put(`/leads/${leadId}/assign`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: leadKeys.detail(leadId) }),
  })
}

export function useAddNote(leadId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { note: string; type?: string }) =>
      api.post(`/leads/${leadId}/notes`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: leadKeys.detail(leadId) }),
  })
}

export function useSetFollowUp(leadId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { followup_at: string; note?: string }) =>
      api.post(`/leads/${leadId}/followup`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: leadKeys.detail(leadId) }),
  })
}