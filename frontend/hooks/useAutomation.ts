import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────

export interface AutomationLog {
  automation_type: 'stale_lead_nudge' | 'followup_customer_email'
  recipient_email: string
  status: 'sent' | 'failed' | 'skipped'
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface AutomationSummaryRow {
  automation_type: string
  status: string
  total: number
}

export interface AutomationSettings {
  stale_lead_days: number
  followup_customer_email: boolean
  recent_logs: AutomationLog[]
  summary: AutomationSummaryRow[]
}

// ── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Fetches automation settings + recent log for the Automation page.
 */
export function useAutomationSettings() {
  return useQuery<AutomationSettings>({
    queryKey: ['automation-settings'],
    queryFn: () => api.get<AutomationSettings>('/automations/settings'),
    staleTime: 60_000,   // 1 min — settings don't change often
    refetchOnWindowFocus: false,
  })
}

/**
 * Saves the stale_lead_days value for this business.
 */
export function useUpdateAutomationSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (staleDays: number) =>
      api.put<{ message: string; stale_lead_days: number }>('/automations/settings', { stale_lead_days: staleDays }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-settings'] })
    },
  })
}