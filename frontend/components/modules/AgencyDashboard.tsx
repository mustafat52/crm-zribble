/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useStore } from '@/store/useStore'
import { CLIENTS, LEAD_SOURCES, AI_ALERTS, RECENT_ACTIVITY } from '@/data/mockData'
import ClientAvatar from '@/components/shared/ClientAvatar'
import AskAIBar from '@/components/shared/AskAIBar'

export default function AgencyDashboard() {
  const { openClient, openAlert, openAttention, showToast } = useStore()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>

      {/* ── TOP STATS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { val: '₹30.5Cr', label: 'Total Pipeline',   color: 'var(--accent)',  glow: '#c8f13520', icon: '💰' },
          { val: '735',     label: 'Active Leads',      color: 'var(--blue)',    glow: '#4db8ff20', icon: '◎' },
          { val: '24%',     label: 'Avg Conversion',    color: 'var(--green)',   glow: '#22f06b20', icon: '📈' },
          { val: '4',       label: 'Active Clients',    color: 'var(--purple)',  glow: '#c084fc20', icon: '◫' },
        ].map(s => (
          <div key={s.label} className="stat-box" style={{ boxShadow: `0 0 24px ${s.glow}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <span style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{s.label}</span>
            </div>
            <div className="val" style={{ color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* ── 3 COLUMNS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, flex: 1, minHeight: 0 }}>

        {/* ── COL 1: CLIENTS ── */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>All clients</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Click any client to drill in</div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => showToast('Add client form — coming in full build')}>
              + Add client
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {CLIENTS.map(c => (
              <ClientRow key={c.id} client={c} onClick={() => openClient(c.id)} />
            ))}
            <div
              style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '10px 0', cursor: 'pointer', marginTop: 4 }}
              onClick={() => showToast('Loading 30 more clients…')}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = '0.75'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = '1'}   
            >
              + 30 more clients
            </div>
          </div>
        </div>

        {/* ── COL 2: SOURCES + ATTENTION ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
          {/* Lead Sources */}
          <div className="panel">
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Lead sources — all clients</div>
            {LEAD_SOURCES.map(s => (
              <div key={s.name} className="source-row">
                <span className="source-label">{s.name}</span>
                <div className="source-bar-wrap">
                  <div className="source-bar" style={{ width: `${Math.round(s.val / 2184 * 100)}%`, background: s.color }} />
                </div>
                <span className="source-val">{s.val.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* Attention */}
          <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Clients needing attention</div>

            {/* PixelForce alert card */}
            <div style={{
              background: 'linear-gradient(135deg, #1a0a0a, #2a0f0f)',
              border: '1px solid #6b141440',
              borderLeft: '3px solid var(--red)',
              borderRadius: 'var(--radius)',
              padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span className="dot dot-red" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                  PixelForce — conv. dropped 6% this week
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>14% → 8% · Last action: 3 days ago</div>
              </div>
              <button
                className="btn btn-sm"
                style={{ background: 'var(--red-bg)', color: 'var(--red)', borderColor: '#ff6b6b40', fontWeight: 600 }}
                onClick={() => openAttention('pixelforce-conv')}
              >Act</button>
            </div>

            {/* DigiFlow alert card */}
            <div style={{
              background: 'linear-gradient(135deg, #1a1200, #2a1d00)',
              border: '1px solid #6b300040',
              borderLeft: '3px solid var(--amber)',
              borderRadius: 'var(--radius)',
              padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span className="dot dot-amber" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                  DigiFlow — 18 leads untouched 7+ days
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Est. value at risk: ₹1.2Cr</div>
              </div>
              <button className="btn btn-sm" onClick={() => openAttention('digiflow-stale')}>Review</button>
            </div>

            <AskAIBar placeholder="Ask AI anything… try 'focus today'" />
          </div>
        </div>

        {/* ── COL 3: ALERTS + ACTIVITY ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
          {/* AI Alerts */}
          <div className="panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>AI alerts</div>
              <span style={{
                fontSize: 11, fontWeight: 700,
                background: 'var(--red-bg)', color: 'var(--red)',
                padding: '2px 8px', borderRadius: 10,
                fontFamily: 'DM Mono, monospace',
              }}>3 new</span>
            </div>
            {AI_ALERTS.map((alert, i) => (
              <div
                key={alert.id}
                onClick={() => openAlert(alert.screen)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '10px 0',
                  borderBottom: i < AI_ALERTS.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <div style={{
                  width: 34, height: 34,
                  borderRadius: 9,
                  background: alert.color,
                  color: alert.textColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                  border: `1px solid ${alert.textColor}30`,
                }}>{alert.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{alert.title}</strong>{' '}
                    {alert.message}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                    {alert.time} · <span style={{ color: alert.textColor }}>Click to review</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Recent activity</div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {RECENT_ACTIVITY.map((a, i) => (
                <div key={i} className="activity-item">
                  <div className="activity-bar" style={{ background: a.color }} />
                  <div>
                    <div className="activity-text" dangerouslySetInnerHTML={{ __html: a.text }} />
                    <div className="activity-time">{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ClientRow({ client: c, onClick }: { 
  client: any
  onClick: () => void 
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 10px',
        borderRadius: 'var(--radius)',
        cursor: 'pointer',
        border: '1px solid transparent',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--bg3)'
        e.currentTarget.style.borderColor = 'var(--border)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.borderColor = 'transparent'
      }}
    >
      <ClientAvatar initials={c.initials} color={c.color} textColor={c.textColor} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {c.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>{c.leads} leads · {c.users} users</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{c.pipeline}</div>
        <div style={{ fontSize: 12, color: c.convColor, fontWeight: 500 }}>{c.conv}% conv.</div>
      </div>
      <span className={`dot dot-${c.dot}`} />
    </div>
  )
}