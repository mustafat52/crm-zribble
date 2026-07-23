'use client'
// app/forgot-password/page.tsx — email-OTP reset (3 steps)

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { ZribbleLogo } from '@/components/shared/ZribbleLogo'

type Step = 'email' | 'otp' | 'password'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep]       = useState<Step>('email')
  const [email, setEmail]     = useState('')
  const [otp, setOtp]         = useState('')
  const [resetToken, setRT]   = useState('')
  const [pw, setPw]           = useState('')
  const [pw2, setPw2]         = useState('')
  const [err, setErr]         = useState<string | null>(null)
  const [ok, setOk]           = useState<string | null>(null)
  const [busy, setBusy]       = useState(false)

  async function sendCode(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setOk('If that email exists, a code is on its way.'); setStep('otp')
    } catch { setErr('Something went wrong. Try again.') } finally { setBusy(false) }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true)
    try {
      const res = await api.post<{ reset_token: string }>('/auth/verify-otp', { email, otp })
      setRT(res.reset_token); setOk(null); setStep('password')
    } catch { setErr('Invalid or expired code.') } finally { setBusy(false) }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    if (pw !== pw2) { setErr('Passwords do not match.'); return }
    setBusy(true)
    try {
      await api.post('/auth/reset-password', {
        email, reset_token: resetToken, password: pw, password_confirmation: pw2,
      })
      router.push('/login?reset=1')
    } catch { setErr('Reset session expired. Please start again.'); setStep('email') }
    finally { setBusy(false) }
  }
const DOTS = [
  { x: '3%', y: '12%', s: 165, c: 'var(--brand-pink)',   d: '0s'  },
  { x: '78%', y: '12%', s: 165,  c: 'var(--accent)',       d: '.4s'  },
  { x: '58%', y: '72%', s: 110, c: 'var(--brand-pink-2)', d: '1.2s'  },
  { x: '22%', y: '80%', s: 90,  c: 'var(--accent)',       d: '1.8s' },
]
  return (
    <div style={{ position: 'absolute', inset:0, zIndex:0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'black', padding: 24 }}>
      {DOTS.map((d, i) => (
        <span key={i} data-zr-anim style={{
          position: 'absolute', left: d.x, top: d.y, width: d.s, height: d.s,
          borderRadius: '50%', background: d.c, opacity: 0.85,
          animation: `zr-dot-drift 2.58s ease-in-out ${d.d} infinite`,
        }} />
      ))}
      <div style={{ width: '100%', maxWidth: 380, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 40, boxShadow: 'var(--shadow-md)' }}>
        <div style={{ marginBottom: 24 }}><ZribbleLogo height={26} variant="dark" /></div>

        {step === 'email' && (
          <form onSubmit={sendCode} style={form}>
            <h2 style={h2}>Reset your password</h2>
            <p style={sub}>Enter your email and we&apos;ll send you a 6-digit code.</p>
            <input type="email" required placeholder="you@company.com" value={email}
              onChange={(e) => setEmail(e.target.value)} style={input} />
            <Submit busy={busy} label="Send code" />
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={verify} style={form}>
            <h2 style={h2}>Enter your code</h2>
            <p style={sub}>We sent a 6-digit code to {email}.</p>
            <input inputMode="numeric" pattern="[0-9]*" maxLength={6} required
              placeholder="123456" value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              style={{ ...input, fontFamily: 'var(--font-mono)', letterSpacing: 8, textAlign: 'center', fontSize: 20 }} />
            <Submit busy={busy} label="Verify" />
            <button type="button" onClick={() => setStep('email')} style={ghost}>Use a different email</button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={reset} style={form}>
            <h2 style={h2}>Set a new password</h2>
            <input type="password" required minLength={8} placeholder="New password" value={pw}
              onChange={(e) => setPw(e.target.value)} style={input} />
            <input type="password" required minLength={8} placeholder="Confirm password" value={pw2}
              onChange={(e) => setPw2(e.target.value)} style={input} />
            <Submit busy={busy} label="Reset password" />
          </form>
        )}

        {ok  && <p style={{ color: 'var(--green-text)', fontSize: 13, marginTop: 14 }}>{ok}</p>}
        {err && <p style={{ color: 'var(--red-text)',   fontSize: 13, marginTop: 14 }}>{err}</p>}

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link href="/login" style={{ fontSize: 13, color: 'var(--text3)', textDecoration: 'none' }}>← Back to sign in</Link>
        </div>
      </div>
    </div>
  )
}

function Submit({ busy, label }: { busy: boolean; label: string }) {
  return (
    <button type="submit" disabled={busy} style={{
      width: '100%', padding: '11px 16px', background: busy ? 'var(--accent-2)' : 'var(--accent)',
      color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600,
      cursor: busy ? 'not-allowed' : 'pointer', marginTop: 4,
    }}>{busy ? 'Please wait…' : label}</button>
  )
}

const form:  React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14 }
const h2:    React.CSSProperties = { fontSize: 20, fontWeight: 700, color: 'var(--text)' }
const sub:   React.CSSProperties = { fontSize: 14, color: 'var(--text3)', marginTop: -6 }
const input: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, outline: 'none' }
const ghost: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, cursor: 'pointer', marginTop: 2 }
