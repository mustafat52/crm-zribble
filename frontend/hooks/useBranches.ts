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
}

export interface BranchPayload {
  name: string
  city?: string
  whatsapp_number?: string
  manager_id?: string | null
}

interface BranchesResponse {
  data: Branch[]
  total: number
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
    total: data?.total ?? 0,
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