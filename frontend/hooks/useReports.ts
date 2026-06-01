import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface ReportFilters {
  branch_id?: string
  source?: string
  status_id?: string
  assigned_to?: string
  date_from?: string
  date_to?: string
}

export interface LeadRow {
  id: string
  name: string
  mobile: string
  source: string
  status: string
  status_color: string
  is_converted: boolean
  assigned_to: string | null
  branch: string | null
  created_at: string
  last_contacted_at: string | null
  days_since_contact: number | null
  contact_label: 'today' | '2-3 days' | '4+ days' | 'never'
}

export interface TeamMemberReport {
  id: string
  name: string
  email: string
  assigned: number
  contacted: number
  converted: number
  conversion_rate: number
  missed_followups: number
  followup_compliance: number | null
  done_followups: number
  total_followups: number
  avg_response_minutes: number | null
}

export interface SourceRow {
  source: string
  total: number
  converted: number
  conversion_rate: number
  avg_days_to_convert: number | null
  share: number
}

export interface ReportBranch {
  id: string
  name: string
  is_active: boolean
}

export interface ReportStatus {
  id: string
  name: string
  color: string
}

export interface ReportTeamMember {
  id: string
  name: string
}

export function buildQs(filters: ReportFilters): string {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) params.append(k, v)
  })
  const s = params.toString()
  return s ? `?${s}` : ''
}

export function useLeadsReport(filters: ReportFilters) {
  return useQuery<{ leads: LeadRow[]; summary: { total: number; converted: number; conversion_rate: number } }>({
    queryKey: ['report-leads', filters],
    queryFn: () => api.get(`/reports/leads${buildQs(filters)}`),
    staleTime: 60 * 1000,
  })
}

export function useTeamReport(filters: Pick<ReportFilters, 'branch_id' | 'date_from' | 'date_to'>) {
  return useQuery<{ members: TeamMemberReport[] }>({
    queryKey: ['report-team', filters],
    queryFn: () => api.get(`/reports/team${buildQs(filters)}`),
    staleTime: 60 * 1000,
  })
}

export function useSourcesReport(filters: Pick<ReportFilters, 'branch_id' | 'date_from' | 'date_to'>) {
  return useQuery<{ sources: SourceRow[]; grand_total: number }>({
    queryKey: ['report-sources', filters],
    queryFn: () => api.get(`/reports/sources${buildQs(filters)}`),
    staleTime: 60 * 1000,
  })
}

export function useDashboardStatsForReports(branchId?: string) {
  const params = branchId ? `?branch_id=${branchId}` : ''
  return useQuery({
    queryKey: ['dashboard-stats', branchId],
    queryFn: () => api.get(`/reports/dashboard${params}`),
    staleTime: 5 * 60 * 1000,
  })
}

export function useReportBranches() {
  return useQuery({
    queryKey: ['report-branches'],
    queryFn: () => api.get('/branches'),
    staleTime: 5 * 60 * 1000,
    select: (res: any) => {
      const raw = Array.isArray(res) ? res : (res?.data ?? res?.branches ?? [])
      return (raw as ReportBranch[]).filter((b) => b.is_active)
    },
  })
}

export function useReportStatuses() {
  return useQuery({
    queryKey: ['report-statuses'],
    queryFn: () => api.get('/lead-statuses'),
    staleTime: 5 * 60 * 1000,
    select: (res: any) => {
      return Array.isArray(res) ? res : (res?.data ?? [])
    },
  })
}

export function useReportTeamMembers() {
  return useQuery({
    queryKey: ['report-team-members'],
    queryFn: () => api.get('/team'),
    staleTime: 5 * 60 * 1000,
    select: (res: any) => {
      const raw = Array.isArray(res) ? res : (res?.data ?? [])
      return raw.map((u: any) => ({ id: u.id, name: u.name })) as ReportTeamMember[]
    },
  })
}