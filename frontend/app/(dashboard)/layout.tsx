'use client'
// app/(dashboard)/layout.tsx

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { usePushNotifications } from '@/hooks/usePushNotifications';
import NotificationBell from '@/components/modules/notifications/NotificationBell'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isHydrated      = useAuthStore((s) => s._hasHydrated)
  const { permission, subscribe } = usePushNotifications() 

  useEffect(() => {
    if (isHydrated && !isAuthenticated) router.replace('/login')
  }, [isHydrated, isAuthenticated, router])

  if (!isHydrated) return null
  if (!isAuthenticated) return null

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg2)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Topbar />
        {permission === 'default' && (
        <div style={{
          background: 'var(--bg2)',
          borderBottom: '1px solid var(--border)',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          color: 'var(--text2)',
          flexShrink: 0,
        }}>
          <span>🔔 Enable push notifications for instant lead and follow-up alerts</span>
          <button onClick={subscribe} style={{
            background: 'var(--accent)', color: '#fff', border: 'none',
            borderRadius: '6px', padding: '5px 14px', fontSize: '12px',
            cursor: 'pointer', fontWeight: 600, marginLeft: '16px',
          }}>
            Enable
          </button>
        </div>
      )}
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {children}
      </main>
      </div>
    </div>
  )
}

// ── Sidebar ──────────────────────────────────────────────────────────────────

const NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
  { label: 'Leads',     href: '/leads',    icon: UsersIcon },
  { label: 'Reports',   href: '/reports',  icon: ChartIcon },
  { label: 'Branches',  href: '/branches', icon: BranchIcon },
  { label: 'Settings',  href: '/settings', icon: SettingsIcon },
]

function Sidebar() {
  const user      = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const pathname  = usePathname()

  return (
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
            display: 'inline-block',
            marginLeft: 6,
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--accent)',
            background: 'var(--sidebar-active-bg)',
            border: '1px solid var(--accent-border)',
            borderRadius: 4,
            padding: '1px 5px',
            letterSpacing: '0.4px',
          }}>
            BETA
          </span>
        </div>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        <p style={{
          fontSize: 10, fontWeight: 600,
          color: 'var(--sidebar-text2)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          padding: '0 8px 6px',
        }}>
          Workspace
        </p>

        {NAV.map((item) => {
          const active = pathname?.startsWith(item.href)
          return (
            
              <a key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '8px 10px',
                borderRadius: 'var(--radius)',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? '#fff' : 'var(--sidebar-text)',
                background: active ? 'var(--sidebar-active-bg)' : 'transparent',
                borderLeft: active ? '2px solid var(--sidebar-active-border)' : '2px solid transparent',
                marginBottom: 2,
                transition: 'all var(--transition)',
                textDecoration: 'none',
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover-bg)'
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <item.icon active={active} />
              {item.label}
            </a>
          )
        })}
      </div>  
      
      {/* User footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--sidebar-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, overflow: 'hidden' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#fff',
            flexShrink: 0, letterSpacing: '-0.3px',
          }}>
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{
              fontSize: 12, fontWeight: 500,
              color: 'var(--sidebar-text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user?.name ?? 'User'}
            </p>
            <p style={{
              fontSize: 11,
              color: 'var(--sidebar-text2)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user?.roles?.[0] ?? ''}
            </p>
          </div>
        </div>

        <button
          onClick={clearAuth}
          title="Sign out"
          style={{
            background: 'none', border: 'none',
            color: 'var(--sidebar-text2)',
            cursor: 'pointer', padding: '4px',
            borderRadius: 5, flexShrink: 0,
            transition: 'color var(--transition)',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text2)'}
        >
          <LogoutIcon />
        </button>
      </div>
    </nav>
  )
}

// ── Topbar ────────────────────────────────────────────────────────────────────

function Topbar() {
  const pathname = usePathname()
  const parts    = pathname?.split('/').filter(Boolean) ?? []
  const label    = parts[parts.length - 1] ?? 'dashboard'
  const display  = label.charAt(0).toUpperCase() + label.slice(1)

  return (
    <header style={{
      height: 'var(--topbar-height)',
      background: 'var(--bg)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      flexShrink: 0,
    }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, color: 'var(--text3)' }}>Dashboard</span>
        <span style={{ fontSize: 13, color: 'var(--border3)' }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{display}</span>
      </div>

      {/* Right side — bell */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <NotificationBell />
      </div>
    </header>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function UsersIcon({ active }: { active?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}>
      <circle cx="6" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M1 13c0-2.485 2.239-4.5 5-4.5S11 10.515 11 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M11.5 7a2 2 0 100-4M14 13c0-1.657-1.12-3-2.5-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

function ChartIcon({ active }: { active?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}>
      <rect x="1" y="9" width="3.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="5.75" y="5.5" width="3.5" height="8" rx="1" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="10.5" y="1.5" width="3.5" height="12" rx="1" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  )
}

function BranchIcon({ active }: { active?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}>
      <circle cx="3.5" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="11.5" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="7.5" cy="12.5" r="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M3.5 4v3a4 4 0 004 4M11.5 4v3a4 4 0 01-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

function SettingsIcon({ active }: { active?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}>
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.93 2.93l1.06 1.06M11.01 11.01l1.06 1.06M2.93 12.07l1.06-1.06M11.01 3.99l1.06-1.06" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5.5 2H3a1.5 1.5 0 00-1.5 1.5v7A1.5 1.5 0 003 12h2.5M9.5 10.5L12 8l-2.5-2.5M5.5 8H12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function DashboardIcon({ active }: { active?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}>
      <rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="8.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="1" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  )
}