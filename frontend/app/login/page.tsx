'use client'
// app/login/page.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { api } from '@/lib/api'

interface LoginResponse {
  access_token: string
  user: {
    id: string
    name: string
    email: string
    roles: string[]
    business_id: string
    branch_id: string | null
  }
}

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await api.post<LoginResponse>('/auth/login', { email, password })
      setAuth(res.access_token,{
        ...res.user,
        roles: res.user.roles ?? [res.user.roles].filter(Boolean), // convert single role to array
      })
      router.push('/leads')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg2)',
    }}>
      <div style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '40px',
        width: '100%',
        maxWidth: '380px',
        boxShadow: 'var(--shadow-md)',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}>
            <div style={{
              width: '28px', height: '28px',
              background: 'var(--accent)',
              borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 4h10M2 7h6M2 10h8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text)' }}>LeadOS</span>
          </div>
          <p style={{ color: 'var(--text3)', fontSize: '13px' }}>Sign in to your workspace</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text2)', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@company.com"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border2)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color var(--transition)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border2)')}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text2)', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border2)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color var(--transition)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border2)')}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-sm)',
              color: '#dc2626',
              fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '9px 16px',
              background: loading ? 'var(--border2)' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background var(--transition)',
              marginTop: '4px',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}