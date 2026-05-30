import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/useAuthStore'
import {api} from '@/lib/api'

export interface DashboardStats {
  total: number
  today: number
  thisWeek: number
  thisMonth: number
  converted: number
  conversionRate: number
  overdue: number
  bySource: { source: string; total: number }[]
  byStatus: { name: string; color: string; total: number }[]
  last7: { day: string; date: string; total: number }[]
}

export interface LeadRow {
  id: string
  name: string
  mobile: string
  email: string | null
  source: string
  created_at: string
  lead_value: number | null
  converted_at: string | null
  next_followup_at: string | null
  status_name: string
  status_color: string
  assignee_name: string | null
  branch_name: string | null
}

export interface LeadsReport {
  leads: LeadRow[]
  total: number
  converted: number
  conversion_rate: number
}

export interface TeamMember {
  id: string
  name: string
  email: string
  branch_name: string
  assigned: number
  converted: number
  conversion_rate: number
  followups_done: number
  followup_pct: number
}

export interface SourceRow {
  source: string
  total: number
  converted: number
  conversion_rate: number
}

export type ReportFilters = {
  date_from?: string
  date_to?: string
  source?: string
  status_id?: string
  branch_id?: string
  assigned_to?: string
}

function buildQs(filters: ReportFilters): string {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
  const s = params.toString()
  return s ? `?${s}` : ''
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['reports', 'dashboard'],
    queryFn: () => api.get<DashboardStats>('/reports/dashboard'),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}

export function useLeadsReport(filters: ReportFilters) {
  return useQuery<LeadsReport>({
    queryKey: ['reports', 'leads', filters],
    queryFn: () => api.get<LeadsReport>(`/reports/leads${buildQs(filters)}`),
    staleTime: 60_000,
  })
}

export function useTeamReport(filters: ReportFilters) {
  return useQuery<{ members: TeamMember[] }>({
    queryKey: ['reports', 'team', filters],
    queryFn: () => api.get<{ members: TeamMember[] }>(`/reports/team${buildQs(filters)}`),
    staleTime: 60_000,
  })
}

export function useSourcesReport(filters: ReportFilters) {
  return useQuery<{ sources: SourceRow[] }>({
    queryKey: ['reports', 'sources', filters],
    queryFn: () => api.get<{ sources: SourceRow[] }>(`/reports/sources${buildQs(filters)}`),
    staleTime: 60_000,
  })
}

export function useReportBranches() {
  return useQuery<{ id: string; name: string }[]>({
    queryKey: ['branches', 'list'],
    queryFn: () => api.get<{ id: string; name: string; is_active: boolean }[]>('/branches')
      .then((res: { id: string; name: string; is_active: boolean }[]) =>
        res.filter((b) => b.is_active).map((b) => ({ id: b.id, name: b.name }))
      ),
    staleTime: 5 * 60 * 1000,
  })
}

export function useReportStatuses() {
  return useQuery<{ id: string; name: string; color: string }[]>({
    queryKey: ['lead-statuses'],
    queryFn: () => api.get<{ id: string; name: string; color: string }[]>('/lead-statuses'),
    staleTime: 5 * 60 * 1000,
  })
}

export function useReportTeamMembers() {
  return useQuery<{ id: string; name: string }[]>({
    queryKey: ['team', 'list'],
    queryFn: async () => {
      const res = await api.get<{ id: string; name: string }[] | { data: { id: string; name: string }[] }>('/team')
      const arr = Array.isArray(res) ? res : (res as { data: { id: string; name: string }[] }).data ?? []
      return arr.map(m => ({ id: m.id, name: m.name }))
    },
    staleTime: 5 * 60 * 1000,
  })
}