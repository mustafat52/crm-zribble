import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ─── Types ───────────────────────────────────────────────────

export interface DashboardStats {
  total: number
  thisMonth: number
  today: number
  converted: number
  conversionRate: number
  activeLeads: number
  overdue: number
  followupsDueToday: number
  unassigned: number
  contactRate: number
  bySource: { source: string; total: number }[]
  byStatus: { name: string; color: string; total: number }[]
  last7: { day: string; date: string; total: number }[]
  branchBreakdown: { branch: string; leads: number; converted: number; conversion_rate: number }[]
}

export interface QueueItem {
  followup_id: string | null
  lead_id: string
  lead_name: string
  mobile: string
  source: string
  status: string
  status_color: string
  assigned_staff: string | null
  due_time: string | null
  note: string | null
  category: 'overdue' | 'due_today' | 'unassigned'
}

export interface ActionQueue {
  overdue: QueueItem[]
  due_today: QueueItem[]
  unassigned: QueueItem[]
  counts: { overdue: number; due_today: number; unassigned: number; total: number }
}

export interface ActivityItem {
  id: string
  type: string
  description: string
  created_at: string
  lead_id: string
  lead_name: string
  user_name: string | null
}

export interface Branch {
  id: string
  name: string
  city: string | null
  is_active: boolean
}

// ─── Hooks ───────────────────────────────────────────────────

export function useDashboardStats(branchId?: string) {
  const params = branchId ? `?branch_id=${branchId}` : ''
  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', branchId],
    queryFn:  () => api.get(`/reports/dashboard${params}`),
    staleTime:       5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}

export function useActionQueue(branchId?: string) {
  const params = branchId ? `?branch_id=${branchId}` : ''
  return useQuery<ActionQueue>({
    queryKey: ['action-queue', branchId],
    queryFn:  () => api.get(`/reports/action-queue${params}`),
    staleTime:       60 * 1000,
    refetchInterval: 60 * 1000,
  })
}

export function useRecentActivity(branchId?: string) {
  const params = branchId ? `?branch_id=${branchId}` : ''
  return useQuery<{ activities: ActivityItem[] }>({
    queryKey: ['recent-activity', branchId],
    queryFn:  () => api.get(`/reports/activity${params}`),
    staleTime:       60 * 1000,
    refetchInterval: 60 * 1000,
  })
}

export function useDashboardBranches() {
  return useQuery<{ data?: Branch[]; branches?: Branch[] } | Branch[]>({
    queryKey: ['dashboard-branches'],
    queryFn:  () => api.get('/branches'),
    staleTime: 5 * 60 * 1000,
    select: (res: any) => {
      const raw = Array.isArray(res) ? res : (res?.data ?? res?.branches ?? [])
      return (raw as Branch[]).filter((b: Branch) => b.is_active)
    },
  })
}

export function useMarkFollowupDoneFromQueue(leadId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (followupId: string) =>
      api.post(`/leads/${leadId}/followups/${followupId}/done`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['action-queue'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}