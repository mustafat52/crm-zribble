// lib/api.ts
// Central API client — attaches Bearer token, handles 401, typed responses.

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000') + '/api/v1'

function getToken(): string | null {
  // Read from localStorage directly so this works outside React components too.
  // useAuthStore persists under the key 'auth-storage'.
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