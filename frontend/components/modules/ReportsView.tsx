'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts'
import {
  useDashboardStatsForReports,
  useLeadsReport,
  useTeamReport,
  useSourcesReport,
  useReportBranches,
  useReportStatuses,
  useReportTeamMembers,
  ReportFilters,
  LeadRow,
  TeamMemberReport,
} from '@/hooks/useReports'
import { useAuthStore } from '@/store/useAuthStore'
import { api } from '@/lib/api'

// ─── Constants ────────────────────────────────────────────────

const PURPLE   = '#7c3aed'
const PURPLE_LT = '#ddd6fe'

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#fff', border: '1px solid #e5e7eb',
    borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    fontSize: 12, padding: '8px 12px',
  },
}

// ─── Helpers ─────────────────────────────────────────────────

function fmtMinutes(mins: number | null): string {
  if (mins === null || mins === undefined) return '—'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function contactColor(label: string): string {
  if (label === 'today')    return '#16a34a'
  if (label === '2-3 days') return '#d97706'
  if (label === '4+ days')  return '#ef4444'
  return '#9ca3af' // never
}

// ─── Shared UI atoms ─────────────────────────────────────────

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 20px', fontSize: 13, fontWeight: 600,
        border: 'none', borderBottom: active ? `2px solid ${PURPLE}` : '2px solid transparent',
        background: 'none', color: active ? PURPLE : 'var(--text3)',
        cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

function FilterSelect({
  label, value, onChange, options, placeholder = 'All',
}: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; placeholder?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          fontSize: 13, padding: '7px 10px', borderRadius: 8,
          border: '1px solid var(--border)', background: 'var(--bg)',
          color: 'var(--text)', cursor: 'pointer',
        }}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      <input
        type="date" value={value} onChange={e => onChange(e.target.value)}
        style={{
          fontSize: 13, padding: '7px 10px', borderRadius: 8,
          border: '1px solid var(--border)', background: 'var(--bg)',
          color: 'var(--text)', cursor: 'pointer',
        }}
      />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--border)',
      borderRadius: 14, overflow: 'hidden', marginBottom: 20,
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</h3>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

function KPICard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '18px 20px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent ?? 'var(--text)', lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function SkeletonRow() {
  return (
    <tr>
      {Array(6).fill(0).map((_, i) => (
        <td key={i} style={{ padding: '12px 16px' }}>
          <div style={{ height: 12, background: 'var(--border)', borderRadius: 4, width: '70%', animation: 'pulse 1.5s infinite' }} />
        </td>
      ))}
    </tr>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{
      padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600,
      color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em',
      background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </th>
  )
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)', borderBottom: '1px solid var(--border)', ...style }}>
      {children}
    </td>
  )
}

// ─── Export Button (reusable) ─────────────────────────────────

function ExportButton({ filters }: { filters: ReportFilters }) {
  const [state, setState] = useState<'idle' | 'queuing' | 'generating' | 'failed'>('idle')
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const downloadedRef = useRef(false)

  async function startExport() {
    setState('queuing')
    downloadedRef.current = false
    try {
      const qs = new URLSearchParams(filters as any).toString()
      const res = await api.post<{ export_id: string; poll_url: string }>(`/reports/exports?${qs}`, {})
      const exportId = res.export_id
      setState('generating')

      pollRef.current = setInterval(async () => {
        try {
          const status = await api.get<{ status: string; url?: string }>(`/reports/exports/${exportId}/status`)
          if (status.status === 'ready' && !downloadedRef.current) {
            downloadedRef.current = true
            clearInterval(pollRef.current!)
            const stored = localStorage.getItem('auth-storage')
            const token  = stored ? JSON.parse(stored)?.state?.token : null
            const dlRes  = await fetch(`http://localhost:8000/api/v1/reports/exports/${exportId}/download`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
            const blob = await dlRes.blob()
            const url  = URL.createObjectURL(blob)
            const a    = document.createElement('a')
            a.href = url; a.download = `leads-report.xlsx`; a.click()
            URL.revokeObjectURL(url)
            setState('idle')
          } else if (status.status === 'failed') {
            clearInterval(pollRef.current!)
            setState('failed')
          }
        } catch { clearInterval(pollRef.current!); setState('failed') }
      }, 2000)
    } catch { setState('failed') }
  }

  return (
    <button
      onClick={state === 'idle' || state === 'failed' ? startExport : undefined}
      disabled={state === 'queuing' || state === 'generating'}
      style={{
        padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
        border: '1px solid var(--border)', cursor: state === 'idle' || state === 'failed' ? 'pointer' : 'default',
        background: state === 'failed' ? '#fef2f2' : 'var(--bg)',
        color: state === 'failed' ? '#ef4444' : 'var(--text)',
      }}
    >
      {state === 'idle'      ? '⬇ Export Excel' :
       state === 'queuing'   ? '⏳ Queuing...' :
       state === 'generating' ? '⚙ Generating...' :
       '✕ Failed — Retry'}
    </button>
  )
}

// ─── TAB 1: Overview ─────────────────────────────────────────

function OverviewTab({ branchId }: { branchId: string }) {
  const { data: stats, isLoading } = useDashboardStatsForReports(branchId || undefined) as { data: any; isLoading: boolean }
  const showBranch = (stats?.branchBreakdown ?? []).length > 1

  const kpis = [
    { label: 'Total Leads',    value: stats?.total        ?? '—', accent: PURPLE },
    { label: 'This Month',     value: stats?.thisMonth    ?? '—' },
    { label: 'Conversion Rate',value: `${stats?.conversionRate ?? 0}%`, accent: '#16a34a' },
    { label: 'Active Leads',   value: stats?.activeLeads  ?? '—', accent: '#3b82f6' },
    { label: 'Overdue Follow-Ups', value: stats?.overdue  ?? '—', accent: (stats?.overdue ?? 0) > 0 ? '#ef4444' : undefined },
    { label: 'Contact Rate',   value: `${stats?.contactRate ?? 0}%` },
  ]

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 24 }}>
        {isLoading
          ? Array(6).fill(0).map((_, i) => <div key={i} style={{ height: 90, background: 'var(--bg2)', borderRadius: 12, border: '1px solid var(--border)', animation: 'pulse 1.5s infinite' }} />)
          : kpis.map(k => <KPICard key={k.label} {...k} />)
        }
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Leads Trend (Last 7 Days) */}
        <Section title="Leads Trend — Last 7 Days">
          {isLoading ? (
            <div style={{ height: 200, background: 'var(--bg2)', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats?.last7 ?? []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="total" name="Leads" radius={[4, 4, 0, 0]}>
                  {(stats?.last7 ?? []).map((_: any, i: number, arr: any[]) => (
                    <Cell key={i} fill={i === arr.length - 1 ? PURPLE : PURPLE_LT} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        {/* Leads by Status (Donut) */}
        <Section title="Leads by Status">
          {isLoading ? (
            <div style={{ height: 200, background: 'var(--bg2)', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats?.byStatus ?? []} cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  dataKey="total" nameKey="name" paddingAngle={3}
                >
                  {(stats?.byStatus ?? []).map((s: any, i: number) => (
                    <Cell key={i} fill={s.color ?? `hsl(${i * 60}, 60%, 55%)`} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Section>
      </div>

      {/* Leads by Source */}
      <Section title="Leads by Source">
        {isLoading ? (
          <div style={{ height: 180, background: 'var(--bg2)', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats?.bySource ?? []} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="source" width={90} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="total" name="Leads" fill={PURPLE} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* Branch Breakdown (only if multi-branch) */}
      {showBranch && (
        <Section title="Branch Breakdown">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <Th>Branch</Th>
                  <Th>Leads</Th>
                  <Th>Converted</Th>
                  <Th>Conversion Rate</Th>
                </tr>
              </thead>
              <tbody>
                {(stats?.branchBreakdown ?? []).map((b: any, i: number) => (
                  <tr key={i}>
                    <Td>{b.branch}</Td>
                    <Td>{b.leads}</Td>
                    <Td>{b.converted}</Td>
                    <Td>
                      <span style={{
                        color: PURPLE, fontWeight: 700,
                        background: PURPLE_LT, padding: '2px 8px', borderRadius: 8, fontSize: 12,
                      }}>
                        {b.conversion_rate}%
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  )
}

// ─── TAB 2: Leads Analysis ────────────────────────────────────

function LeadsTab({ branchId, branches, statuses, teamMembers }: {
  branchId: string
  branches: any[]
  statuses: any[]
  teamMembers: any[]
}) {
  const router = useRouter()
  const [filters, setFilters] = useState<ReportFilters>({})

  const activeFilters: ReportFilters = {
    ...filters,
    ...(branchId ? { branch_id: branchId } : {}),
  }

  const { data, isLoading } = useLeadsReport(activeFilters)
  const leads    = data?.leads    ?? []
  const summary  = data?.summary

  function setFilter(key: keyof ReportFilters, val: string) {
    setFilters(f => ({ ...f, [key]: val || undefined }))
  }

  function clearFilters() { setFilters({}) }

  return (
    <div>
      {/* Filters */}
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '16px 20px', marginBottom: 20,
        display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        <FilterSelect label="Source" value={filters.source ?? ''} onChange={v => setFilter('source', v)}
          options={['Facebook','Instagram','Website','WhatsApp','Manual','Referral','Walk-in','API'].map(s => ({ value: s.toLowerCase(), label: s }))} />
        <FilterSelect label="Status" value={filters.status_id ?? ''} onChange={v => setFilter('status_id', v)}
          options={statuses.map((s: any) => ({ value: s.id, label: s.name }))} />
        <FilterSelect label="Staff" value={filters.assigned_to ?? ''} onChange={v => setFilter('assigned_to', v)}
          options={teamMembers.map((m: any) => ({ value: m.id, label: m.name }))} />
        {!branchId && branches.length > 1 && (
          <FilterSelect label="Branch" value={filters.branch_id ?? ''} onChange={v => setFilter('branch_id', v)}
            options={branches.map((b: any) => ({ value: b.id, label: b.name }))} />
        )}
        <DateInput label="From" value={filters.date_from ?? ''} onChange={v => setFilter('date_from', v)} />
        <DateInput label="To"   value={filters.date_to ?? ''}   onChange={v => setFilter('date_to', v)} />
        <button
          onClick={clearFilters}
          style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
            border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text2)',
            alignSelf: 'flex-end',
          }}
        >
          Clear
        </button>
        <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
          <ExportButton filters={activeFilters} />
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {[
            ['Total', summary.total],
            ['Converted', summary.converted],
            ['Rate', `${summary.conversion_rate}%`],
          ].map(([l, v]) => (
            <div key={l as string} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 16px', fontSize: 13, color: 'var(--text)',
            }}>
              <span style={{ color: 'var(--text3)', marginRight: 6 }}>{l}</span>
              <strong>{v}</strong>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr>
                <Th>Lead Name</Th>
                <Th>Source</Th>
                <Th>Status</Th>
                <Th>Assigned To</Th>
                <Th>Created</Th>
                <Th>Last Contact</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array(8).fill(0).map((_, i) => <SkeletonRow key={i} />)
                : leads.length === 0
                ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--text3)', fontSize: 14 }}>
                      No leads found for the selected filters.
                    </td>
                  </tr>
                )
                : leads.map((lead: LeadRow) => (
                  <tr
                    key={lead.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => window.open(`/leads/${lead.id}`, '_blank')}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    <Td>
                      <div style={{ fontWeight: 600 }}>{lead.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{lead.mobile}</div>
                    </Td>
                    <Td>{lead.source}</Td>
                    <Td>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
                        background: (lead.status_color ?? '#6366f1') + '22',
                        color: lead.status_color ?? '#6366f1',
                      }}>
                        {lead.status ?? '—'}
                      </span>
                    </Td>
                    <Td>{lead.assigned_to ?? <span style={{ color: 'var(--text3)' }}>Unassigned</span>}</Td>
                    <Td style={{ fontSize: 12, color: 'var(--text2)' }}>
                      {new Date(lead.created_at).toLocaleDateString('en-IN')}
                    </Td>
                    <Td>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
                        color: '#fff',
                        background: contactColor(lead.contact_label),
                      }}>
                        {lead.contact_label === 'today'    ? '🟢 Today' :
                         lead.contact_label === '2-3 days' ? '🟡 2-3 Days' :
                         lead.contact_label === '4+ days'  ? '🔴 4+ Days' :
                         '⚪ Never'}
                      </span>
                    </Td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── TAB 3: Team Performance ──────────────────────────────────

function TeamTab({ branchId, branches, isOwnerOrManager }: {
  branchId: string; branches: any[]; isOwnerOrManager: boolean
}) {
  const [filters, setFilters] = useState<Pick<ReportFilters, 'branch_id' | 'date_from' | 'date_to'>>({})

  const activeFilters = { ...filters, ...(branchId ? { branch_id: branchId } : {}) }
  const { data, isLoading } = useTeamReport(activeFilters)
  const members = data?.members ?? []

  if (!isOwnerOrManager) {
    return (
      <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text3)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Team Performance is visible to Owners and Managers only.</div>
      </div>
    )
  }

  function setFilter(key: string, val: string) {
    setFilters((f: any) => ({ ...f, [key]: val || undefined }))
  }

  return (
    <div>
      {/* Filters */}
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '16px 20px', marginBottom: 20,
        display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        {!branchId && branches.length > 1 && (
          <FilterSelect label="Branch" value={filters.branch_id ?? ''} onChange={v => setFilter('branch_id', v)}
            options={branches.map((b: any) => ({ value: b.id, label: b.name }))} />
        )}
        <DateInput label="From" value={filters.date_from ?? ''} onChange={v => setFilter('date_from', v)} />
        <DateInput label="To"   value={filters.date_to ?? ''}   onChange={v => setFilter('date_to', v)} />
      </div>

      {/* Team Table */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr>
                <Th>Staff</Th>
                <Th>Assigned</Th>
                <Th>Contacted</Th>
                <Th>Converted</Th>
                <Th>Missed Follow-Ups</Th>
                <Th>Conversion %</Th>
                <Th>Follow-Up Compliance</Th>
                <Th>Avg Response Time</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />)
                : members.length === 0
                ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--text3)', fontSize: 14 }}>
                      No team data available.
                    </td>
                  </tr>
                )
                : members.map((m: TeamMemberReport) => {
                  const compliance = m.followup_compliance
                  const compColor  = compliance === null ? 'var(--text3)' : compliance >= 80 ? '#16a34a' : compliance >= 50 ? '#d97706' : '#ef4444'

                  return (
                    <tr key={m.id}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg2)'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                    >
                      <Td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: PURPLE + '22', color: PURPLE,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, flexShrink: 0,
                          }}>
                            {m.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{m.email}</div>
                          </div>
                        </div>
                      </Td>
                      <Td>{m.assigned}</Td>
                      <Td>{m.contacted}</Td>
                      <Td>{m.converted}</Td>
                      <Td>
                        <span style={{ color: m.missed_followups > 0 ? '#ef4444' : 'var(--text2)', fontWeight: m.missed_followups > 0 ? 700 : 400 }}>
                          {m.missed_followups}
                        </span>
                      </Td>
                      <Td>
                        <span style={{
                          fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
                          background: PURPLE_LT, color: PURPLE,
                        }}>
                          {m.conversion_rate}%
                        </span>
                      </Td>
                      <Td>
                        {compliance === null ? (
                          <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, minWidth: 60 }}>
                              <div style={{ width: `${Math.min(compliance, 100)}%`, height: '100%', background: compColor, borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: compColor, minWidth: 36 }}>{compliance}%</span>
                          </div>
                        )}
                      </Td>
                      <Td style={{ fontSize: 12, color: 'var(--text2)' }}>
                        {fmtMinutes(m.avg_response_minutes)}
                      </Td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── TAB 4: Sources Performance ───────────────────────────────

function SourcesTab({ branchId, branches }: { branchId: string; branches: any[] }) {
  const [filters, setFilters] = useState<Pick<ReportFilters, 'branch_id' | 'date_from' | 'date_to'>>({})
  const activeFilters = { ...filters, ...(branchId ? { branch_id: branchId } : {}) }
  const { data, isLoading } = useSourcesReport(activeFilters)
  const sources    = data?.sources    ?? []
  const grandTotal = data?.grand_total ?? 0

  function setFilter(key: string, val: string) {
    setFilters((f: any) => ({ ...f, [key]: val || undefined }))
  }

  return (
    <div>
      {/* Filters */}
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '16px 20px', marginBottom: 20,
        display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        {!branchId && branches.length > 1 && (
          <FilterSelect label="Branch" value={filters.branch_id ?? ''} onChange={v => setFilter('branch_id', v)}
            options={branches.map((b: any) => ({ value: b.id, label: b.name }))} />
        )}
        <DateInput label="From" value={filters.date_from ?? ''} onChange={v => setFilter('date_from', v)} />
        <DateInput label="To"   value={filters.date_to ?? ''}   onChange={v => setFilter('date_to', v)} />
      </div>

      {/* Source Cards */}
      {!isLoading && sources.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
          {sources.map((s: any, i: number) => (
            <div key={i} style={{
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '16px 18px',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{s.source}</div>
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 10 }}>
                <div style={{ width: `${s.share ?? 0}%`, height: '100%', background: PURPLE, borderRadius: 2 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)' }}>
                <span>{s.total} leads</span>
                <span style={{ color: PURPLE, fontWeight: 700 }}>{s.conversion_rate}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sources Table */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr>
                <Th>Source</Th>
                <Th>Total Leads</Th>
                <Th>% of Total</Th>
                <Th>Converted</Th>
                <Th>Conversion %</Th>
                <Th>Avg Days to Convert</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array(6).fill(0).map((_, i) => <SkeletonRow key={i} />)
                : sources.length === 0
                ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--text3)', fontSize: 14 }}>
                      No source data available.
                    </td>
                  </tr>
                )
                : sources.map((s: any, i: number) => (
                  <tr key={i}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    <Td>
                      <span style={{ fontWeight: 600 }}>{s.source}</span>
                    </Td>
                    <Td>{s.total}</Td>
                    <Td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 5, background: 'var(--border)', borderRadius: 3 }}>
                          <div style={{ width: `${s.share ?? 0}%`, height: '100%', background: PURPLE, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{s.share}%</span>
                      </div>
                    </Td>
                    <Td>{s.converted}</Td>
                    <Td>
                      <span style={{
                        fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
                        background: PURPLE_LT, color: PURPLE,
                      }}>
                        {s.conversion_rate}%
                      </span>
                    </Td>
                    <Td style={{ fontSize: 12, color: 'var(--text2)' }}>
                      {s.avg_days_to_convert !== null && s.avg_days_to_convert !== undefined
                        ? `${s.avg_days_to_convert}d`
                        : <span style={{ color: 'var(--text3)' }}>—</span>
                      }
                    </Td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Main Reports View ────────────────────────────────────────

export default function ReportsView() {
  const user          = useAuthStore(s => s.user)
  const isOwner       = user?.roles?.includes('owner') ?? false
  const isManager     = user?.roles?.includes('manager') ?? false
  const isOwnerOrMgr  = isOwner || isManager

  const [activeTab, setActiveTab]       = useState(0)
  const [selectedBranch, setSelectedBranch] = useState('')

  const { data: branches  } = useReportBranches()  as { data: any[] | undefined }
  const { data: statuses  } = useReportStatuses()  as { data: any[] | undefined }
  const { data: teamMembers } = useReportTeamMembers() as { data: any[] | undefined }

  const safeB  = branches    ?? []
  const safeS  = statuses    ?? []
  const safeTM = teamMembers ?? []

  const showBranchSelector = isOwner && safeB.length > 1
  const branchFilter = isOwner ? selectedBranch : (user?.branch_id ?? '')

  const tabs = ['Overview', 'Leads Analysis', 'Team Performance', 'Sources Performance']

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Reports</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', margin: '2px 0 0' }}>
            Performance insights and analytics
          </p>
        </div>

        {showBranchSelector && (
          <select
            value={selectedBranch}
            onChange={e => setSelectedBranch(e.target.value)}
            style={{
              fontSize: 13, padding: '8px 12px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg)',
              color: 'var(--text)', cursor: 'pointer',
            }}
          >
            <option value="">All Branches</option>
            {safeB.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>

      {/* Tab Bar */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--border)',
        marginBottom: 24, overflowX: 'auto',
      }}>
        {tabs.map((t, i) => (
          <TabBtn key={t} label={t} active={activeTab === i} onClick={() => setActiveTab(i)} />
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 0 && <OverviewTab branchId={branchFilter} />}
      {activeTab === 1 && <LeadsTab branchId={branchFilter} branches={safeB} statuses={safeS} teamMembers={safeTM} />}
      {activeTab === 2 && <TeamTab branchId={branchFilter} branches={safeB} isOwnerOrManager={isOwnerOrMgr} />}
      {activeTab === 3 && <SourcesTab branchId={branchFilter} branches={safeB} />}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
    </div>
  )
}