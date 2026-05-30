'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

interface OverdueFollowup {
  id: string
  follow_up_at: string
  note: string | null
  lead_id: string
  lead_name: string
  lead_mobile: string
}

interface DashboardStats {
  total: number
  today: number
  thisWeek: number
  thisMonth: number
  converted: number
  conversionRate: number
  overdue: number
  bySource: { source: string; total: number }[]
  byStatus: { name: string; color: string; total: number }[]
  last7: { day: string; date: string; total: number }[]
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

function StatCard({
  label, value, sub, accent = false
}: {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}) {
  return (
    <div style={{
      background: accent ? '#7c3aed' : '#fff',
      border: `1px solid ${accent ? '#7c3aed' : '#e5e7eb'}`,
      borderRadius: 12, padding: '18px 20px',
    }}>
      <div style={{
        fontSize: 26, fontWeight: 700,
        color: accent ? '#fff' : '#111827',
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 13, fontWeight: 600, marginTop: 4,
        color: accent ? '#e9d5ff' : '#374151',
      }}>
        {label}
      </div>
      {sub && (
        <div style={{
          fontSize: 11, marginTop: 2,
          color: accent ? '#c4b5fd' : '#9ca3af',
        }}>
          {sub}
        </div>
      )}
    </div>
  )
}

const CUSTOM_TOOLTIP_STYLE = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 12,
  color: '#374151',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)',
}

export default function DashboardPage() {
  const router = useRouter()

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get<DashboardStats>('/reports/dashboard')
      return res
    },
    refetchInterval: 300_000,
  })

  const { data: overdueData, isLoading: overdueLoading } = useQuery<OverdueFollowup[]>({
    queryKey: ['followups', 'overdue'],
    queryFn: async () => {
      const res = await api.get<{ data: OverdueFollowup[] }>('/leads/followups/overdue')
      return (res as { data: OverdueFollowup[] }).data
    },
    refetchInterval: 60_000,
  })

  const overdue = overdueData ?? []

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes pulse { 0%,100%{background-position:200% 0} 50%{background-position:0% 0} }`}</style>

      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>
          Dashboard
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>
          Welcome back. Here&apos;s what needs attention today.
        </p>
      </div>

      {/* ── Stat cards ── */}
      {statsLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{
              height: 90, borderRadius: 12, border: '1px solid #e5e7eb',
              background: 'linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%)',
              backgroundSize: '200% 100%', animation: 'pulse 1.4s ease-in-out infinite',
            }} />
          ))}
        </div>
      ) : stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <StatCard label="Total Leads" value={stats.total} sub="all time" accent />
<StatCard label="This Month" value={stats.thisMonth} sub={`${stats.today} today`} />
<StatCard label="Conversion Rate" value={`${stats.conversionRate}%`} sub={`${stats.converted} converted`} />
<StatCard label="Overdue Follow-ups" value={stats.overdue} sub="need attention" />
        </div>
      ) : null}

      {/* ── Two column: Source bar + Status pie ── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Leads by Source — horizontal bar chart */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Leads by Source
              </span>
            </div>
            <div style={{ padding: '20px 20px 12px' }}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={stats.bySource.map(s => ({ name: s.source, Leads: s.total }))}
                  layout="vertical"
                  margin={{ top: 0, right: 24, left: 16, bottom: 0 }}
                >
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#374151' }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip
                    contentStyle={CUSTOM_TOOLTIP_STYLE}
                    cursor={{ fill: '#f3f4f6' }}
                  />
                  <Bar dataKey="Leads" fill="#7c3aed" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Leads by Status — pie chart */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Leads by Status
              </span>
            </div>
            <div style={{ padding: '12px 20px 12px' }}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={stats.byStatus.map(s => ({ name: s.name, value: s.total, color: s.color }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.byStatus.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={CUSTOM_TOOLTIP_STYLE}
                    formatter={(value, name) => [value, name]}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, color: '#374151' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Last 7 days — Recharts bar chart ── */}
      {stats && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Leads — Last 7 Days
            </span>
          </div>
          <div style={{ padding: '20px 20px 12px' }}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={stats.last7.map(d => ({ day: d.date, Leads: d.total }))}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={CUSTOM_TOOLTIP_STYLE}
                  cursor={{ fill: '#f3f4f6' }}
                />
                <Bar dataKey="Leads" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {stats.last7.map((_, i) => (
                    <Cell key={i} fill={i === 6 ? '#7c3aed' : '#ddd6fe'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Overdue follow-ups widget ── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
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
          {overdueLoading ? (
            <div style={{ color: '#9ca3af', fontSize: 13 }}>Loading...</div>
          ) : overdue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#10b981', fontSize: 14, fontWeight: 500 }}>
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
                    cursor: 'pointer',
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
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{f.lead_name}</div>
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

    </div>
  )
}