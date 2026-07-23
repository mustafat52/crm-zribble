'use client'
// app/login/page.tsx — ZRIBBLE login (redesigned)

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/useAuthStore'
import { api } from '@/lib/api'
import { ZribbleLogo } from '@/components/shared/ZribbleLogo'
import { LoginLoader } from '@/components/shared/LoginLoader'
import { BrandDots } from '@/components/shared/BrandDots'

interface LoginResponse {
  access_token: string
  refresh_token: string
  family_id: string
  user: {
    id: string; name: string; email: string; roles: string[]
    business_id: string; branch_id: string | null; active_branch_id: string | null
  }
}

export default function LoginPage() {
  const router  = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)   // true = show ZRIBBLE loader overlay

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)   // ← loader overlay appears NOW, while the request is in flight
    const startedAt = Date.now()
    try {
      const res = await api.post<LoginResponse>('/auth/login', { email, password })
      setAuth(
        res.access_token,
        { ...res.user, roles: res.user.roles ?? [res.user.roles].filter(Boolean) },
        res.refresh_token,
        res.family_id,
      )
      const isAgencyUser =
        res.user.roles?.includes('agency_admin') || res.user.roles?.includes('agency_staff')
      const dest = isAgencyUser ? '/admin/overview' : '/leads'

      // Keep the loader visible a beat so a fast response doesn't flash.
      // The overlay stays up (loading is never reset here) straight through
      // to the redirect — no static gap between "signed in" and the next page.
      const elapsed = Date.now() - startedAt
      setTimeout(() => router.push(dest), Math.max(0, 900 - elapsed))
    } catch {
      // Security: never reveal which field was wrong.
      setError('Invalid email or password')
      setLoading(false)   // ← hide loader, show the error, let them retry
    }
  }

  return (
    <>
      {/* Full-screen ZRIBBLE loader — shown the entire time we're signing in */}
      {loading && <LoginLoader />}

      <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
        {/* LEFT — brand panel */}
        <aside
          className="zr-brand-panel"
          style={{
            flex: '0 0 44%',
            background: 'black',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '48px',
          }}
        >
          <BrandDots />
          <ZribbleLogo height={180} variant="light" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{ color: '#fff', fontSize: 45, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
              Lead management,<br />quietly powerful.
            </h1>
            <p style={{ color: 'var(--sidebar-text2)', fontSize: 15, marginTop: 12, maxWidth: 340 }}>
              Every lead, follow-up, and conversion in one calm workspace.
            </p>
          </div>
          <span style={{ color: 'var(--sidebar-text2)', fontSize: 12 }}>© {new Date().getFullYear()} ZRIBBLE</span>
        </aside>

        {/* RIGHT — form panel */}
        <main style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div style={{ width: '100%', maxWidth: 380 }}>
            {/* Mobile-only logo (brand panel hidden under 860px via CSS) */}
            <div className="zr-mobile-logo" style={{ marginBottom: 24 }}>
              <ZribbleLogo height={26} variant="dark" />
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Welcome back</h2>
            <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 28 }}>Sign in to your workspace</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Email */}
              <div data-zr-anim style={{ animation: 'zr-fade-up 360ms ease both', animationDelay: '40ms' }}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  required placeholder="you@company.com" autoFocus
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border2)')}
                />
              </div>

              {/* Password + toggle */}
              <div data-zr-anim style={{ animation: 'zr-fade-up 360ms ease both', animationDelay: '120ms' }}>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required placeholder="••••••••"
                    style={{ ...inputStyle, paddingRight: 44 }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border2)')}
                  />
                  <button
                    type="button" onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                      color: 'var(--text3)', display: 'flex',
                    }}
                  >
                    {showPw ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div style={{ textAlign: 'right', marginTop: -6 }}>
                <Link href="/forgot-password" style={{ fontSize: 13, color: 'var(--accent-text)', textDecoration: 'none' }}>
                  Forgot password?
                </Link>
              </div>

              {error && (
                <div role="alert" style={{
                  padding: '10px 12px', background: 'var(--red-bg)', border: '1px solid var(--red-border)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--red-text)', fontSize: 13,
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '11px 16px',
                  background: loading ? 'var(--accent-2)' : 'var(--accent)',
                  color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)',
                  fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background var(--transition), transform var(--transition)', marginTop: 4,
                }}
                onMouseDown={(e) => !loading && (e.currentTarget.style.transform = 'scale(0.99)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        </main>
      </div>
    </>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 6,
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid var(--border2)',
  borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)',
  fontSize: 14, outline: 'none', transition: 'border-color var(--transition)',
}

function Eye() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>)
}
function EyeOff() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68"/><path d="M6.06 6.06C3.6 7.7 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.94-1.94"/><path d="m1 1 22 22"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>)
}