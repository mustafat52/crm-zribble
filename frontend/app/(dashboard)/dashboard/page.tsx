'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  useDashboardStats,
  useActionQueue,
  useRecentActivity,
  useDashboardBranches,
  QueueItem,
  Branch,
} from '@/hooks/useDashboard'
import { useAuthStore } from '@/store/useAuthStore'

// ─── Helpers ─────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (mins < 1)    return 'just now'
  if (mins < 60)   return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  return `${days}d ago`
}

function formatDueTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function sourceLabel(src: string): string {
  const map: Record<string, string> = {
    meta: 'Meta', facebook: 'Facebook', instagram: 'Instagram',
    website: 'Website', whatsapp: 'WhatsApp', manual: 'Manual',
    api: 'API', referral: 'Referral', walkin: 'Walk-in', qr: 'QR Code',
  }
  return map[src?.toLowerCase()] ?? src ?? 'Unknown'
}

function activityIcon(type: string): string {
  const icons: Record<string, string> = {
    created: '➕', status_change: '🔄', note: '📝',
    call: '📞', assignment: '👤', followup_set: '📅',
    whatsapp_sent: '💬', email_sent: '✉️', done: '✅',
  }
  return icons[type] ?? '•'
}

// ─── Sub-components ───────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '20px 24px', animation: 'pulse 1.5s infinite',
    }}>
      <div style={{ width: 80, height: 12, background: 'var(--border)', borderRadius: 4, marginBottom: 12 }} />
      <div style={{ width: 60, height: 28, background: 'var(--border)', borderRadius: 6 }} />
    </div>
  )
}

function StatCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: string
}) {
  return (
    <div style={{
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ fontSize: 28, fontWeight: 700, color: accent ?? 'var(--text)', lineHeight: 1.2 }}>
        {value}
      </span>
      {sub && <span style={{ fontSize: 12, color: 'var(--text3)' }}>{sub}</span>}
    </div>
  )
}

function CategoryBadge({ cat }: { cat: QueueItem['category'] }) {
  const map = {
    overdue:    { label: 'Overdue',    color: '#ef4444', bg: '#fef2f2', dot: '🔴' },
    due_today:  { label: 'Due Today',  color: '#f97316', bg: '#fff7ed', dot: '🟠' },
    unassigned: { label: 'Unassigned', color: '#3b82f6', bg: '#eff6ff', dot: '🔵' },
  }
  const c = map[cat]
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px',
      borderRadius: 20, color: c.color, background: c.bg,
      border: `1px solid ${c.color}30`,
    }}>
      {c.dot} {c.label}
    </span>
  )
}

// ─── Action Queue Row ─────────────────────────────────────────

function QueueRow({ item, onMarkDone }: { item: QueueItem; onMarkDone?: () => void }) {
  const router = useRouter()
  const whatsapp = item.mobile ? `https://wa.me/${item.mobile.replace(/\D/g, '')}` : null
  const callLink = item.mobile ? `tel:${item.mobile}` : null

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 120px 100px 120px 100px 120px 160px',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      borderBottom: '1px solid var(--border)',
      transition: 'background 0.15s',
      cursor: 'pointer',
    }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg2)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
    >
      {/* Lead Name */}
      <div onClick={() => router.push(`/leads/${item.lead_id}`)}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{item.lead_name}</div>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>{item.mobile || '—'}</div>
      </div>

      {/* Source */}
      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{sourceLabel(item.source)}</span>

      {/* Status */}
      <span style={{
        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
        background: (item.status_color ?? '#6366f1') + '22',
        color: item.status_color ?? '#6366f1',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {item.status ?? '—'}
      </span>

      {/* Assigned Staff */}
      <span style={{ fontSize: 12, color: item.assigned_staff ? 'var(--text2)' : 'var(--text3)' }}>
        {item.assigned_staff ?? 'Unassigned'}
      </span>

      {/* Due Time */}
      <span style={{ fontSize: 12, color: item.category === 'overdue' ? '#ef4444' : 'var(--text2)' }}>
        {item.category === 'unassigned' ? relativeTime(item.due_time) : formatDueTime(item.due_time)}
      </span>

      {/* Category */}
      <CategoryBadge cat={item.category} />

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
        {callLink && (
          <a href={callLink} style={{
            fontSize: 11, padding: '4px 8px', borderRadius: 6,
            background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
            textDecoration: 'none', fontWeight: 600,
          }}>📞 Call</a>
        )}
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" style={{
            fontSize: 11, padding: '4px 8px', borderRadius: 6,
            background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
            textDecoration: 'none', fontWeight: 600,
          }}>💬 WA</a>
        )}
        {item.followup_id && onMarkDone && (
          <button onClick={onMarkDone} style={{
            fontSize: 11, padding: '4px 8px', borderRadius: 6,
            background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe',
            cursor: 'pointer', fontWeight: 600,
          }}>✓ Done</button>
        )}
      </div>
    </div>
  )
}

// ─── Main Dashboard Page ──────────────────────────────────────

export default function DashboardPage() {
  const user             = useAuthStore(s => s.user)
  const isOwner          = user?.roles?.includes('owner') ?? false

  const [selectedBranch, setSelectedBranch] = useState<string>('')
  const [dateRange, setDateRange]           = useState<'today' | '7d' | '30d' | 'custom'>('30d')
  const [activeQueueTab, setActiveQueueTab] = useState<'overdue' | 'due_today' | 'unassigned'>('overdue')
  const [activityOpen, setActivityOpen]     = useState(true)

  const branchFilter = isOwner ? (selectedBranch || undefined) : (user?.branch_id ?? undefined)

  const { data: branches }  = useDashboardBranches() as { data: Branch[] | undefined }
  const { data: stats, isLoading: statsLoading } = useDashboardStats(branchFilter)
  const { data: queue, isLoading: queueLoading } = useActionQueue(branchFilter)
  const { data: actData }                        = useRecentActivity(branchFilter)

  const showBranchSelector = isOwner && branches && branches.length > 1

  const queueItems = useMemo(() => {
    if (!queue) return []
    return {
      overdue:    queue.overdue,
      due_today:  queue.due_today,
      unassigned: queue.unassigned,
    }[activeQueueTab] ?? []
  }, [queue, activeQueueTab])

  // Pipeline stages from byStatus (sorted by sort_order implicitly)
  const pipelineStages = stats?.byStatus ?? []

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>

      {/* ── Section 1: Top Bar ─────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', margin: '2px 0 0' }}>
            What needs attention right now?
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Branch Selector */}
          {showBranchSelector && (
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              style={{
                fontSize: 13, padding: '7px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text)', cursor: 'pointer',
              }}
            >
              <option value="">All Branches</option>
              {(branches ?? []).map((b: Branch) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}

          {/* Date Range */}
          {(['today', '7d', '30d', 'custom'] as const).map(r => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              style={{
                fontSize: 12, padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                border: '1px solid var(--border)',
                background: dateRange === r ? 'var(--accent)' : 'var(--bg)',
                color: dateRange === r ? '#fff' : 'var(--text2)',
                fontWeight: dateRange === r ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              {r === 'today' ? 'Today' : r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : 'Custom'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Section 2: Business Snapshot Cards ───────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16, marginBottom: 28,
      }}>
        {statsLoading ? (
          Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              label="Leads This Month"
              value={stats?.thisMonth ?? 0}
              sub={`${stats?.today ?? 0} today`}
            />
            <StatCard
              label="Conversion Rate"
              value={`${stats?.conversionRate ?? 0}%`}
              sub={`${stats?.converted ?? 0} converted`}
              accent="var(--accent)"
            />
            <StatCard
              label="Active Leads"
              value={stats?.activeLeads ?? 0}
              sub="currently being worked on"
              accent="#3b82f6"
            />
            <StatCard
              label="Overdue Follow-Ups"
              value={stats?.overdue ?? 0}
              sub={`${stats?.followupsDueToday ?? 0} due today`}
              accent={(stats?.overdue ?? 0) > 0 ? '#ef4444' : undefined}
            />
          </>
        )}
      </div>

      {/* ── Section 3: Action Queue ───────────────────────────── */}
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 14, marginBottom: 28, overflow: 'hidden',
      }}>
        {/* Queue Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px', borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Action Queue
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text3)', margin: '2px 0 0' }}>
              {queue?.counts.total ?? 0} items requiring attention
            </p>
          </div>

          {/* Queue Tabs */}
          <div style={{ display: 'flex', gap: 8 }}>
            {([
              ['overdue',    '🔴', 'Overdue',    queue?.counts.overdue ?? 0],
              ['due_today',  '🟠', 'Due Today',  queue?.counts.due_today ?? 0],
              ['unassigned', '🔵', 'Unassigned', queue?.counts.unassigned ?? 0],
            ] as const).map(([tab, dot, label, count]) => (
              <button
                key={tab}
                onClick={() => setActiveQueueTab(tab)}
                style={{
                  fontSize: 12, padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                  border: '1px solid var(--border)',
                  background: activeQueueTab === tab ? 'var(--accent)' : 'var(--bg2)',
                  color: activeQueueTab === tab ? '#fff' : 'var(--text2)',
                  fontWeight: 600, transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {dot} {label}
                <span style={{
                  background: activeQueueTab === tab ? 'rgba(255,255,255,0.25)' : 'var(--border)',
                  color: activeQueueTab === tab ? '#fff' : 'var(--text3)',
                  borderRadius: 10, padding: '0 6px', fontSize: 11, fontWeight: 700,
                }}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Queue Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 120px 100px 120px 100px 120px 160px',
          gap: 12, padding: '8px 16px',
          background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
        }}>
          {['Lead', 'Source', 'Status', 'Assigned To', 'Time', 'Category', 'Actions'].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {h}
            </span>
          ))}
        </div>

        {/* Queue Rows */}
        {queueLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>
            Loading...
          </div>
        ) : queueItems.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>
              {activeQueueTab === 'overdue' ? '✅' : activeQueueTab === 'due_today' ? '🎉' : '👥'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 500 }}>
              {activeQueueTab === 'overdue' ? 'No overdue follow-ups' :
               activeQueueTab === 'due_today' ? 'No follow-ups due today' :
               'All leads are assigned'}
            </div>
          </div>
        ) : (
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {queueItems.map((item, i) => (
              <QueueRow key={item.followup_id ?? `${item.lead_id}-${i}`} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* ── Section 4 + 5: Pipeline + Activity (side by side) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Section 4: Pipeline Snapshot */}
        <div style={{
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Pipeline Snapshot</h2>
            <p style={{ fontSize: 12, color: 'var(--text3)', margin: '2px 0 0' }}>Lead counts by stage</p>
          </div>

          <div style={{ padding: '8px 0' }}>
            {statsLoading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px' }}>
                  <div style={{ width: 80, height: 12, background: 'var(--border)', borderRadius: 4 }} />
                  <div style={{ width: 30, height: 12, background: 'var(--border)', borderRadius: 4 }} />
                </div>
              ))
            ) : pipelineStages.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                No pipeline data
              </div>
            ) : (
              <>
                {/* Table header */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '8px 20px', borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase' }}>Stage</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase' }}>Count</span>
                </div>
                {pipelineStages.map((stage: { name: string; color: string; total: number }, i: number) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 20px', borderBottom: '1px solid var(--border)',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: stage.color ?? '#6366f1', display: 'inline-block', flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{stage.name}</span>
                    </div>
                    <span style={{
                      fontSize: 15, fontWeight: 700, color: 'var(--text)',
                      background: 'var(--bg2)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '2px 12px',
                    }}>
                      {stage.total}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Section 5: Recent Activity Feed */}
        <div style={{
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          <div
            style={{
              padding: '16px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: 'pointer',
            }}
            onClick={() => setActivityOpen(o => !o)}
          >
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Recent Activity</h2>
              <p style={{ fontSize: 12, color: 'var(--text3)', margin: '2px 0 0' }}>Latest actions across all leads</p>
            </div>
            <span style={{ fontSize: 18, color: 'var(--text3)', transition: 'transform 0.2s', transform: activityOpen ? 'rotate(180deg)' : 'none' }}>
              ▾
            </span>
          </div>

          {activityOpen && (
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {!actData?.activities || actData.activities.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                  No recent activity
                </div>
              ) : (
                actData.activities.map((act, i) => (
                  <div key={act.id ?? i} style={{
                    display: 'flex', gap: 12, padding: '12px 20px',
                    borderBottom: '1px solid var(--border)',
                    alignItems: 'flex-start',
                  }}>
                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{activityIcon(act.type)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {act.lead_name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {act.description}
                      </div>
                      {act.user_name && (
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                          by {act.user_name}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0, marginTop: 2 }}>
                      {relativeTime(act.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}