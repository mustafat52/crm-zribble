// lib/api.ts
// Central API client — attaches Bearer token, handles 401 with token refresh, typed responses.

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000') + '/api/v1'

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('auth-storage')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.token ?? null
  } catch {
    return null
  }
}

function clearAuth() {
  localStorage.removeItem('auth-storage')
  window.location.href = '/login'
}

// T60: Attempt to refresh the access token using the stored refresh_token + family_id.
// Returns the new access token string on success, null on any failure.
async function tryRefresh(): Promise<string | null> {
  try {
    const raw = localStorage.getItem('auth-storage')
    if (!raw) return null

    const state = JSON.parse(raw)?.state
    const refreshToken = state?.refresh_token
    const familyId     = state?.family_id

    if (!refreshToken || !familyId) return null

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken, family_id: familyId }),
    })

    if (!res.ok) return null

    const data = await res.json()
    const newToken        = data.access_token as string
    const newRefreshToken = data.refresh_token as string
    const newFamilyId     = data.family_id as string

    if (!newToken) return null

    // Write new token + refresh credentials back to localStorage
    const stored = JSON.parse(localStorage.getItem('auth-storage') ?? '{}')
    stored.state = {
      ...(stored.state ?? {}),
      token:         newToken,
      refresh_token: newRefreshToken,
      family_id:     newFamilyId,
    }
    localStorage.setItem('auth-storage', JSON.stringify(stored))

    return newToken
  } catch {
    return null
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const token = getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...extraHeaders,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    // T60: Don't retry the refresh endpoint itself — prevents infinite loop
    if (path === '/auth/refresh') {
      clearAuth()
      throw new Error('Session expired. Please log in again.')
    }

    // Attempt silent token refresh before giving up
    const newToken = await tryRefresh()

    if (newToken) {
      // Retry the original request with the new token
      const retryRes = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
          ...headers,
          Authorization: `Bearer ${newToken}`,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })

      if (retryRes.status === 401) {
        clearAuth()
        throw new Error('Unauthenticated')
      }

      if (!retryRes.ok) {
        const err = await retryRes.json().catch(() => ({ message: retryRes.statusText }))
        throw new Error(err?.message ?? `HTTP ${retryRes.status}`)
      }

      if (retryRes.status === 204) return undefined as T

      return retryRes.json() as Promise<T>
    }

    // Refresh failed — log out
    clearAuth()
    throw new Error('Unauthenticated')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err?.message ?? `HTTP ${res.status}`)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

export const api = {
  get:    <T>(path: string)                   => request<T>('GET',    path),
  post:   <T>(path: string, body: unknown)    => request<T>('POST',   path, body),
  put:    <T>(path: string, body: unknown)    => request<T>('PUT',    path, body),
  delete: <T>(path: string)                   => request<T>('DELETE', path),

  // Public ingest — API key auth, no Bearer token
  ingest: <T>(path: string, body: unknown, apiKey: string) =>
    request<T>('POST', path, body, { 'X-API-Key': apiKey }),
}
