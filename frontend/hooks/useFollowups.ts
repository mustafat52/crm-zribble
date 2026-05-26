import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Followup {
  id: string
  follow_up_at: string
  note: string | null
  status: 'pending' | 'done' | 'missed'
  reminded_at: string | null
  assigned_to: string | null
  created_at: string
}

export function useFollowups(leadId: string) {
  return useQuery<Followup[]>({
    queryKey: ['followups', leadId],
    queryFn: async () => {
      const res = await api.get<{ data: Followup[] }>(`/leads/${leadId}/followups`)
      return res.data
    },
    enabled: !!leadId,
  })
}

export function useMarkFollowupDone(leadId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (followupId: string) =>
      api.post(`/leads/${leadId}/followups/${followupId}/done`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['followups', leadId] })
      qc.invalidateQueries({ queryKey: ['lead', leadId] })
    },
  })
}

export function useOverdueFollowups() {
  return useQuery<Followup[]>({
    queryKey: ['followups', 'overdue'],
    queryFn: async () => {
      const res = await api.get<{ data: Followup[] }>('/leads/followups/overdue')
      return res.data
    },
    refetchInterval: 60_000, // refresh every 60s
  })
}