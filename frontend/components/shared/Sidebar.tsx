'use client'

import { useStore } from '@/store/useStore'

const NAV = [
  { id: 'dashboard', label: 'Dashboard',  icon: '◈' },
  { id: 'pipeline',  label: 'Pipeline',   icon: '⧉' },
]
const NAV2 = [
  { id: 'leads',    label: 'All Leads',   icon: '◎' },
  { id: 'clients',  label: 'Clients',     icon: '◫' },
  { id: 'analytics',label: 'Analytics',   icon: '◑' },
]
const NAV3 = [
  { id: 'alerts',    label: 'AI Alerts',  icon: '◉', badge: 3 },
  { id: 'autonudge', label: 'Auto-Nudge', icon: '◐' },
]

export default function Sidebar() {
  const { screen, role, setScreen, switchRole, showToast } = useStore()

  function handleNav(id : string) {
    if (['clients', 'analytics', 'autonudge'].includes(id)) {
      showToast(`${id.charAt(0).toUpperCase() + id.slice(1)} — coming in full build`)
      return
    }
    setScreen(id)
  }

  return (
    <aside style={{
      width: 210,
      background: 'var(--bg2)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '16px 18px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 11,
      }}>
        <div style={{
          width: 34, height: 34,
          background: 'var(--accent)',
          borderRadius: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 15, color: '#000',
          flexShrink: 0,
          boxShadow: '0 0 16px #c8f13540',
        }}>L</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.4px', color: 'var(--text)' }}>LeadOS</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginTop: 1 }}>v2.0 · DEMO</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '10px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {NAV.map(item => (
          <NavItem key={item.id} item={item} active={screen === item.id} onClick={() => handleNav(item.id)} />
        ))}

        <SectionLabel>Management</SectionLabel>
        {NAV2.map(item => (
          <NavItem key={item.id} item={item} active={screen === item.id} onClick={() => handleNav(item.id)} />
        ))}

        <SectionLabel>AI Tools</SectionLabel>
        {NAV3.map(item => (
          <NavItem key={item.id} item={item} active={screen === item.id} onClick={() => handleNav(item.id)} />
        ))}
      </nav>

      {/* Role switcher */}
      <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
        <button
          onClick={switchRole}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border2)',
            background: 'var(--bg3)',
            color: 'var(--text)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg4)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg3)'}
        >
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: role === 'agency' ? 'var(--accent)' : 'var(--blue)',
            boxShadow: role === 'agency' ? '0 0 8px #c8f13580' : '0 0 8px #4db8ff80',
            flexShrink: 0,
          }} />
          <span style={{ flex: 1, textAlign: 'left' }}>
            {role === 'agency' ? 'Agency View' : 'Client View'}
          </span>
          <span style={{ color: 'var(--text3)', fontSize: 14 }}>⇄</span>
        </button>
        <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 6 }}>
          {role === 'agency' ? 'Superadmin · All clients' : 'AdSync India · Isolated'}
        </div>
      </div>
    </aside>
  )
}

function NavItem({ item, active, onClick }: { item: any; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '8px 12px',
        borderRadius: 'var(--radius)',
        border: 'none',
        background: active ? 'var(--accent-bg)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text2)',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        transition: 'all 0.15s',
        boxShadow: active ? '0 0 12px #c8f13520' : 'none',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--text)' } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)' } }}
    >
      <span style={{ fontSize: 15, opacity: active ? 1 : 0.7 }}>{item.icon}</span>
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge && (
        <span style={{
          background: 'var(--red-bg)', color: 'var(--red)',
          fontSize: 10, fontWeight: 700,
          padding: '1px 6px', borderRadius: 10,
          fontFamily: 'DM Mono, monospace',
        }}>{item.badge}</span>
      )}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, color: 'var(--text3)',
      padding: '12px 12px 4px',
      textTransform: 'uppercase',
      letterSpacing: '0.8px',
      fontWeight: 600,
    }}>{children}</div>
  )
}