// hooks/useLeads.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Lead {
  id: string
  business_id: string
  branch_id: string | null
  assigned_to: string | null
  lead_status_id: string | null
  name: string
  mobile: string
  email: string | null
  source: string | null
  campaign: string | null
  city: string | null
  interested_in: string | null
  lead_value: number | null
  tags: string[]
  is_duplicate: boolean
  duplicate_of: string | null
  last_contacted_at: string | null
  next_followup_at: string | null
  converted_at: string | null
  created_at: string
  updated_at: string
  status: {
    id: string
    name: string
    color: string
    sort_order: number
    is_converted: boolean
    is_lost: boolean
  } | null
  assignedTo: {
    id: string
    name: string
    email: string
  } | null
}

export interface LeadFilters {
  search?: string
  status_id?: string
  source?: string
  assigned_to?: string
  date_from?: string
  date_to?: string
  page?: number
}

export interface PaginatedLeads {
  data: Lead[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  next_page_url: string | null
  prev_page_url: string | null
}

function buildQueryString(filters: LeadFilters): string {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, val]) => {
    if (val !== undefined && val !== '' && val !== null) {
      params.set(key, String(val))
    }
  })
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function useLeads(filters: LeadFilters = {}) {
  const qs = buildQueryString(filters)

  const { data, isLoading, isError, error } = useQuery<PaginatedLeads>({
    queryKey: ['leads', filters],
    queryFn: () => api.get<PaginatedLeads>(`/leads${qs}`),
    refetchInterval: 30_000, // 30s polling — switches to WebSocket in Phase 2
  })

  return {
    leads: data?.data ?? [],
    pagination: data
      ? {
          currentPage: data.current_page,
          lastPage: data.last_page,
          perPage: data.per_page,
          total: data.total,
          hasNext: !!data.next_page_url,
          hasPrev: !!data.prev_page_url,
        }
      : null,
    isLoading,
    isError,
    error,
  }
}