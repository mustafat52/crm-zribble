import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface BranchManager {
  id: string
  name: string
  email: string
}

export interface Branch {
  id: string
  name: string
  city: string | null
  whatsapp_number: string | null
  is_active: boolean
  manager_id: string | null
  manager: BranchManager | null
  created_at: string
  total_leads: number           // ← NEW
  converted_leads: number       // ← NEW
  conversion_ratio: number
}

export interface BranchPayload {
  name: string
  city?: string
  whatsapp_number?: string
  manager_id?: string | null
}

export interface BranchOverall {
      total_leads: number
      conversion_rate: number
      pending_followups: number
      avg_response_minutes: number | null
     }

     interface BranchesResponse {
      data: Branch[]
      total: number
      overall: BranchOverall
     }

// ── Query key ─────────────────────────────────────────────────────────────────

const BRANCHES_KEY = ['branches'] as const

// ── Hooks ──────────────────────────────────────────────────────────────────────

/** Fetch all branches for the current business. Polls every 30s. */
export function useBranches() {
      const { data, isLoading, isError } = useQuery<BranchesResponse>({
        queryKey: BRANCHES_KEY,
        queryFn: () => api.get<BranchesResponse>('/branches'),
        refetchInterval: 30_000,
      })

      return {
        branches: data?.data ?? [],
        total:    data?.total ?? 0,
        overall:  data?.overall ?? null,
        isLoading,
        isError,
      }
    }

/** Create a new branch. */
export function useCreateBranch() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: BranchPayload) =>
      api.post<{ data: Branch }>('/branches', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: BRANCHES_KEY }),
  })
}

/** Update an existing branch. */
export function useUpdateBranch() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<BranchPayload> }) =>
      api.put<{ data: Branch }>(`/branches/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: BRANCHES_KEY }),
  })
}

/** Toggle active / inactive status. */
export function useToggleBranch() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      api.put<{ data: Branch }>(`/branches/${id}/toggle`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: BRANCHES_KEY }),
  })
}

/** Delete a branch. */
export function useDeleteBranch() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/branches/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: BRANCHES_KEY }),
  })
}

export interface BranchStaffMember {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
}

export interface BranchDetailResponse {
  branch: Branch
  staff: BranchStaffMember[]
}

/** Fetch a single branch with its staff list (read-only). */
export function useBranchDetail(id: string | null) {
  return useQuery<BranchDetailResponse>({
    queryKey: ['branch-detail', id],
    queryFn: () => api.get<BranchDetailResponse>(`/branches/${id}`),
    enabled: Boolean(id),
    staleTime: 30_000,
  })
}

/** Switch the owner's active branch. Updates auth store on success. */
export function useSwitchBranch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (branchId: string) =>
      api.post<{ active_branch_id: string; message: string }>(`/branches/${branchId}/switch`, {}),
    onSuccess: () => {
      // Invalidate all branch-scoped data
      qc.invalidateQueries({ queryKey: BRANCHES_KEY })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['action-queue'] })
      qc.invalidateQueries({ queryKey: ['recent-activity'] })
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['report-leads'] })
      qc.invalidateQueries({ queryKey: ['report-team'] })
      qc.invalidateQueries({ queryKey: ['report-sources'] })
    },
  })
}