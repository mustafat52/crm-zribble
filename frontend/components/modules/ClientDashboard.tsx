'use client'

import { useStore } from '@/store/useStore'
import { CLIENTS, LEAD_SOURCES, RECENT_ACTIVITY } from '@/data/mockData'
import ClientAvatar from '@/components/shared/ClientAvatar'
import AskAIBar from '@/components/shared/AskAIBar'

export default function ClientDashboard() {
  const { openClient, showToast } = useStore()
  const c = CLIENTS[0] // AdSync India in client view

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ClientAvatar initials={c.initials} color={c.color} textColor={c.textColor} size={40} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{c.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
              {c.leads} leads · {c.users} users · Client view (data-isolated)
            </div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => openClient('adsync')}>
          View Pipeline →
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { val: c.pipeline, label: 'Pipeline Value',   color: 'var(--text)' },
          { val: `${c.conv}%`, label: 'Conversion Rate', color: 'var(--green)' },
          { val: c.leads,   label: 'Total Leads',       color: 'var(--text)' },
          { val: c.users,   label: 'Team Members',      color: 'var(--text)' },
        ].map(s => (
          <div key={s.label} className="stat-box">
            <div className="val" style={{ color: s.color }}>{s.val}</div>
            <div className="label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 2 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, flex: 1, minHeight: 0 }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="panel">
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Lead sources</div>
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

          <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Quick actions</div>
            <ActionCard
              num={1}
              title="Review hot leads in pipeline"
              sub="3 leads scored 80+ waiting for action"
              onClick={() => openClient('adsync')}
            />
            <ActionCard
              num={2}
              title="Send AI-drafted follow-ups"
              sub="5 leads not contacted in 3+ days"
              onClick={() => showToast('AI drafts ready — opening email composer…')}
            />
            <ActionCard
              num={3}
              title="Import new leads from CSV"
              sub="Drag-and-drop import available"
              onClick={() => showToast('CSV import — coming in full build')}
            />
            <AskAIBar placeholder="Ask about your leads… try 'stale'" />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="panel">
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>AI alerts — your account</div>
            {[
              { icon: '📈', bg: 'var(--accent-bg)', tc: 'var(--accent)', title: 'Pipeline up 31%', msg: 'this month. Best performance in 6 months.', time: 'Today' },
              { icon: '🎯', bg: 'var(--teal-bg)',   tc: 'var(--teal)',   title: 'Sneha Iyer',       msg: 'viewed pricing page 3 times today. Intent signal high.', time: '2h ago' },
              { icon: '⚠️', bg: 'var(--amber-bg)',  tc: 'var(--amber)',  title: '5 leads',          msg: 'not contacted in 3+ days. Auto-nudge available.', time: '4h ago' },
            ].map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '9px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 'var(--radius)',
                  background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, flexShrink: 0,
                }}>{a.icon}</div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--text)', fontWeight: 500 }}>{a.title}</strong>{' '}{a.msg}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Recent activity</div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {RECENT_ACTIVITY.filter(a => a.client === 'adsync').concat(RECENT_ACTIVITY.slice(0, 3)).slice(0, 5).map((a, i) => (
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

function ActionCard({ num, title, sub, onClick }: { 
  num: number
  title: string
  sub: string
  onClick: () => void 
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '10px 12px',
        display: 'flex', alignItems: 'flex-start', gap: 8,
        cursor: 'pointer', transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--accent)',
        background: 'var(--accent-bg)', width: 18, height: 18,
        borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 1,
      }}>{num}</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  )
}
