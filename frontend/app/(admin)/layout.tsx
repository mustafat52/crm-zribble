'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'

const NAV = [
  { label: 'Overview', href: '/admin/overview' },
  { label: 'Businesses', href: '/admin/businesses' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router    = useRouter()
  const isAuth    = useAuthStore(s => s.isAuthenticated)
  const hydrated  = useAuthStore(s => s._hasHydrated)
  const user      = useAuthStore(s => s.user)
  const clearAuth = useAuthStore(s => s.clearAuth)
  const pathname  = usePathname()

  useEffect(() => {
    if (!hydrated) return
    if (!isAuth) { router.replace('/login'); return }
    if (!user?.roles?.includes('agency_admin')) router.replace('/dashboard')
  }, [hydrated, isAuth, user, router])

  if (!hydrated || !isAuth) return null

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg2)' }}>
      {/* Sidebar */}
      <nav style={{
        width: 'var(--sidebar-width)',
        height: '100vh',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          height: 'var(--topbar-height)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid var(--sidebar-border)',
          gap: '10px',
        }}>
          <div style={{
            width: 28, height: 28,
            background: 'var(--accent)',
            borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 0 0 1px rgba(255,255,255,0.12) inset',
          }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 3.5h9M2 6.5h5.5M2 9.5h7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--sidebar-text)', letterSpacing: '-0.2px' }}>
              LeadOS
            </span>
            <span style={{
              display: 'inline-block', marginLeft: 6, fontSize: 10, fontWeight: 600,
              color: 'var(--accent)', background: 'var(--sidebar-active-bg)',
              border: '1px solid var(--accent-border)', borderRadius: 4,
              padding: '1px 5px', letterSpacing: '0.4px',
            }}>
              ADMIN
            </span>
          </div>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          <p style={{
            fontSize: 10, fontWeight: 600, color: 'var(--sidebar-text2)',
            textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px 6px',
          }}>
            Agency
          </p>
          {NAV.map(item => {
            const active = pathname?.startsWith(item.href)
            return (
              <a key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 10px', borderRadius: 'var(--radius)',
                fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? '#fff' : 'var(--sidebar-text)',
                background: active ? 'var(--sidebar-active-bg)' : 'transparent',
                borderLeft: active ? '2px solid var(--sidebar-active-border)' : '2px solid transparent',
                marginBottom: 2, transition: 'all var(--transition)', textDecoration: 'none',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover-bg)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                {item.label}
              </a>
            )
          })}
        </div>

        {/* User footer */}
        <div style={{
          padding: '12px 16px', borderTop: '1px solid var(--sidebar-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, overflow: 'hidden' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0, letterSpacing: '-0.3px',
            }}>
              {user?.name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--sidebar-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name ?? 'Admin'}
              </p>
              <p style={{ fontSize: 11, color: 'var(--sidebar-text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                agency_admin
              </p>
            </div>
          </div>
          <button
            onClick={() => { clearAuth(); router.replace('/login') }}
            title="Sign out"
            style={{ background: 'none', border: 'none', color: 'var(--sidebar-text2)', cursor: 'pointer', padding: '4px', borderRadius: 5, flexShrink: 0, transition: 'color var(--transition)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text2)'}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5.5 2H3a1.5 1.5 0 00-1.5 1.5v7A1.5 1.5 0 003 12h2.5M9.5 10.5L12 8l-2.5-2.5M5.5 8H12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </nav>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{
          height: 'var(--topbar-height)', background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>Agency Admin</span>
            <span style={{ fontSize: 13, color: 'var(--border3)' }}>/</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
              {pathname?.split('/').filter(Boolean).pop()?.charAt(0).toUpperCase() + (pathname?.split('/').filter(Boolean).pop()?.slice(1) ?? '')}
            </span>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}