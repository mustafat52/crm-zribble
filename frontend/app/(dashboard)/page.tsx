'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import{ api } from '@/lib/api'

interface OverdueFollowup {
  id: string
  follow_up_at: string
  note: string | null
  lead_id: string
  lead_name: string
  lead_mobile: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function DashboardPage() {
  const router = useRouter()

  const { data: overdueData, isLoading } = useQuery<OverdueFollowup[]>({
    queryKey: ['followups', 'overdue'],
    queryFn: async () => {
      const res = await api.get<{ data: OverdueFollowup[] }>('/leads/followups/overdue')
      return res.data
    },
    refetchInterval: 60_000,
  })

  const overdue = overdueData ?? []

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>
          Dashboard
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>
          Welcome back. Here&apos;s what needs attention today.
        </p>
      </div>

      {/* Overdue follow-ups widget */}
      <div style={{
        background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🔴</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Overdue Follow-ups
            </span>
            {overdue.length > 0 && (
              <span style={{
                background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '1px 8px',
              }}>
                {overdue.length}
              </span>
            )}
          </div>
          <button
            onClick={() => router.push('/leads')}
            style={{
              padding: '5px 12px', borderRadius: 7, border: '1px solid #e5e7eb',
              background: '#f9fafb', fontSize: 12, fontWeight: 600,
              color: '#374151', cursor: 'pointer',
            }}
          >
            View All Leads →
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {isLoading ? (
            <div style={{ color: '#9ca3af', fontSize: 13 }}>Loading...</div>
          ) : overdue.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '24px 0',
              color: '#10b981', fontSize: 14, fontWeight: 500,
            }}>
              ✅ No overdue follow-ups — you&apos;re all caught up!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {overdue.map(f => (
                <div
                  key={f.id}
                  onClick={() => router.push(`/leads/${f.lead_id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '10px 14px', borderRadius: 8,
                    background: '#fff5f5', border: '1px solid #fecaca',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff5f5')}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: '#fecaca', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 14, flexShrink: 0,
                    fontWeight: 700, color: '#dc2626',
                  }}>
                    {f.lead_name?.slice(0, 1).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                      {f.lead_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>
                      {f.lead_mobile} · Due {fmtDateTime(f.follow_up_at)}
                    </div>
                    {f.note && (
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.note}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, flexShrink: 0 }}>
                    {timeAgo(f.follow_up_at)} overdue
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* More widgets will go here in T33 (Dashboard stats API) */}
      <div style={{
        background: '#f9fafb', borderRadius: 12, border: '1px dashed #d1d5db',
        padding: '32px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13,
      }}>
        📊 Stats charts coming in T33 — Dashboard Stats API (Redis cached)
      </div>

    </div>
  )
}