'use client'

import { useState, useCallback } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  useDashboardStats, useLeadsReport, useTeamReport, useSourcesReport,
  useReportBranches, useReportStatuses, useReportTeamMembers,
  ReportFilters,
} from '@/hooks/useReports'
import {api} from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'leads' | 'team' | 'sources'

// ── Shared helpers ─────────────────────────────────────────────────────────

const PURPLE    = '#7c3aed'
const PURPLE_LT = '#ddd6fe'

const TOOLTIP_STYLE: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 12,
  color: 'var(--text)',
}

function fmt(n: number) {
  return n.toLocaleString('en-IN')
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton({ h = 18, w = '100%' }: { h?: number; w?: string | number }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: 6,
      background: 'var(--border)', opacity: 0.5,
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  )
}

// ── Stat card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <p style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, margin: 0 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '-0.5px' }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>{sub}</p>}
    </div>
  )
}

// ── Section card wrapper ───────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--text)',
      }}>
        {title}
      </div>
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  )
}

// ── DateRangePicker ────────────────────────────────────────────────────────

function DateRangePicker({
  from, to, onChange,
}: {
  from: string; to: string;
  onChange: (from: string, to: string) => void
}) {
  const INPUT: React.CSSProperties = {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '7px 10px',
    fontSize: 12,
    color: 'var(--text)',
    outline: 'none',
    cursor: 'pointer',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <input
        type="date"
        value={from}
        onChange={e => onChange(e.target.value, to)}
        style={INPUT}
      />
      <span style={{ fontSize: 12, color: 'var(--text3)' }}>to</span>
      <input
        type="date"
        value={to}
        onChange={e => onChange(from, e.target.value)}
        style={INPUT}
      />
    </div>
  )
}

// ── FilterSelect ───────────────────────────────────────────────────────────

function FilterSelect({
  value, onChange, placeholder, options,
}: {
  value: string; onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '7px 10px',
        fontSize: 12,
        color: value ? 'var(--text)' : 'var(--text3)',
        outline: 'none',
        cursor: 'pointer',
        minWidth: 130,
      }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

// ── ExportButton (reuses T37 pattern) ─────────────────────────────────────

function ExportButton({ filters }: { filters: ReportFilters }) {
  const [state, setState] = useState<'idle' | 'queuing' | 'generating' | 'failed'>('idle')

  const startExport = useCallback(async () => {
    setState('queuing')
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
      const res = await api.post<{ export_id: string; poll_url: string }>(
        `/reports/exports?${params.toString()}`, {}
      )
      const exportId = res.export_id
      setState('generating')

      let downloaded = false
      const interval = setInterval(async () => {
        if (downloaded) return
        try {
          const status = await api.get<{ status: string; url?: string }>(`/reports/exports/${exportId}/status`)
          if (status.status === 'ready' && !downloaded) {
            downloaded = true
            clearInterval(interval)
            const stored = localStorage.getItem('auth-storage')
            const token  = stored ? JSON.parse(stored)?.state?.token : null
            const dlRes  = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/v1/reports/exports/${exportId}/download`,
              token ? { headers: { Authorization: `Bearer ${token}` } } : {}
            )
            const blob = await dlRes.blob()
            const url  = URL.createObjectURL(blob)
            const a    = document.createElement('a')
            a.href = url; a.download = 'leads-export.xlsx'; a.click()
            URL.revokeObjectURL(url)
            setState('idle')
          } else if (status.status === 'failed') {
            clearInterval(interval)
            setState('failed')
          }
        } catch { clearInterval(interval); setState('failed') }
      }, 2000)
    } catch { setState('failed') }
  }, [filters])

  const label = state === 'queuing' ? 'Queuing…' : state === 'generating' ? 'Generating…' : state === 'failed' ? 'Failed — Retry' : 'Export Excel'
  const disabled = state === 'queuing' || state === 'generating'

  return (
    <button
      onClick={startExport}
      disabled={disabled}
      style={{
        background: disabled ? 'var(--border)' : PURPLE,
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        padding: '7px 14px',
        fontSize: 12,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', gap: 6,
        transition: 'opacity 0.15s',
      }}
    >
      {disabled && (
        <span style={{
          width: 12, height: 12, borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.4)',
          borderTopColor: '#fff',
          display: 'inline-block',
          animation: 'spin 0.7s linear infinite',
        }} />
      )}
      {label}
    </button>
  )
}

// ── OVERVIEW TAB ──────────────────────────────────────────────────────────

function OverviewTab({ filters }: { filters: ReportFilters }) {
  const { data: stats, isLoading } = useDashboardStats()
  const { data: sourcesData }      = useSourcesReport(filters)
  const user                       = useAuthStore(s => s.user)
  const isOwner                    = user?.roles?.includes('owner')

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}><Skeleton h={14} w="60%" /><div style={{ marginTop: 8 }}><Skeleton h={28} w="40%" /></div></div>)}
        </div>
      </div>
    )
  }

  const sources = sourcesData?.sources ?? stats?.bySource?.map(s => ({ source: s.source, total: s.total, converted: 0, conversion_rate: 0 })) ?? []
  const statuses = stats?.byStatus ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="Total Leads" value={fmt(stats?.total ?? 0)} sub={`${fmt(stats?.thisMonth ?? 0)} this month`} />
        <StatCard label="This Month"  value={fmt(stats?.thisMonth ?? 0)} sub={`${fmt(stats?.today ?? 0)} today`} />
        <StatCard label="Conversion Rate" value={`${stats?.conversionRate ?? 0}%`} sub={`${fmt(stats?.converted ?? 0)} converted`} />
        <StatCard label="Overdue Follow-ups" value={fmt(stats?.overdue ?? 0)} sub="pending & past due" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>

        {/* Leads by Source bar chart */}
        <SectionCard title="Leads by Source">
          {sources.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0, padding: '20px 0' }}>No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sources} layout="vertical" margin={{ left: 16, right: 16 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="source" tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="total" fill={PURPLE} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Leads by Status donut */}
        <SectionCard title="Leads by Status">
          {statuses.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0, padding: '20px 0' }}>No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statuses}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {statuses.map((s, i) => (
                    <Cell key={i} fill={s.color || PURPLE} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* Branch breakdown — Owner only */}
      {isOwner && sources.length > 0 && (
        <SectionCard title="Source Conversion Breakdown">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Source', 'Total', 'Converted', 'Rate'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text3)', fontWeight: 500, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sources.map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border2)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 500 }}>{s.source}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{fmt(s.total)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{fmt(s.converted)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        background: s.conversion_rate > 0 ? 'rgba(124,58,237,0.12)' : 'var(--border)',
                        color: s.conversion_rate > 0 ? PURPLE : 'var(--text3)',
                        borderRadius: 6, padding: '2px 8px', fontWeight: 600, fontSize: 12,
                      }}>
                        {s.conversion_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  )
}

// ── LEADS TAB ─────────────────────────────────────────────────────────────

function LeadsTab({ filters, onFiltersChange }: {
  filters: ReportFilters
  onFiltersChange: (f: ReportFilters) => void
}) {
  const { data, isLoading } = useLeadsReport(filters)
  const { data: statuses }  = useReportStatuses()
  const { data: branches }  = useReportBranches()
  const { data: team }      = useReportTeamMembers()

  const SOURCES = ['website', 'meta', 'whatsapp', 'manual', 'api', 'qr', 'instagram', 'facebook']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <DateRangePicker
            from={filters.date_from ?? ''}
            to={filters.date_to ?? ''}
            onChange={(from, to) => onFiltersChange({ ...filters, date_from: from, date_to: to })}
          />
          <FilterSelect
            value={filters.source ?? ''}
            onChange={v => onFiltersChange({ ...filters, source: v })}
            placeholder="All Sources"
            options={SOURCES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
          />
          <FilterSelect
            value={filters.status_id ?? ''}
            onChange={v => onFiltersChange({ ...filters, status_id: v })}
            placeholder="All Statuses"
            options={(statuses ?? []).map(s => ({ value: s.id, label: s.name }))}
          />
          <FilterSelect
            value={filters.branch_id ?? ''}
            onChange={v => onFiltersChange({ ...filters, branch_id: v })}
            placeholder="All Branches"
            options={(branches ?? []).map(b => ({ value: b.id, label: b.name }))}
          />
          <FilterSelect
            value={filters.assigned_to ?? ''}
            onChange={v => onFiltersChange({ ...filters, assigned_to: v })}
            placeholder="All Assignees"
            options={(team ?? []).map(m => ({ value: m.id, label: m.name }))}
          />
          {Object.values(filters).some(Boolean) && (
            <button
              onClick={() => onFiltersChange({})}
              style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer', padding: '4px 6px' }}
            >
              Clear
            </button>
          )}
        </div>
        <ExportButton filters={filters} />
      </div>

      {/* Summary row */}
      {data && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <StatCard label="Showing" value={fmt(data.total)} sub="leads" />
          <StatCard label="Converted" value={fmt(data.converted)} sub="in selection" />
          <StatCard label="Conversion Rate" value={`${data.conversion_rate}%`} sub="of selection" />
        </div>
      )}

      {/* Table */}
      <SectionCard title={`Leads (${fmt(data?.total ?? 0)})`}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4,5].map(i => <Skeleton key={i} h={36} />)}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
              <thead>
                <tr>
                  {['Name', 'Mobile', 'Source', 'Status', 'Assigned To', 'Branch', 'Follow-up', 'Created'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text3)', fontWeight: 500, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.leads ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>No leads match the current filters</td>
                  </tr>
                ) : (data?.leads ?? []).map(lead => (
                  <tr
                    key={lead.id}
                    style={{ borderBottom: '1px solid var(--border2)', cursor: 'pointer' }}
                    onClick={() => window.open(`/leads/${lead.id}`, '_blank')}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover-bg)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 500 }}>{lead.name}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text3)' }}>{lead.mobile}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text3)', textTransform: 'capitalize' }}>{lead.source}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        background: (lead.status_color || PURPLE) + '22',
                        color: lead.status_color || PURPLE,
                        borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                      }}>
                        {lead.status_name}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text3)' }}>{lead.assignee_name ?? '—'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text3)' }}>{lead.branch_name ?? '—'}</td>
                    <td style={{ padding: '10px 12px', color: lead.next_followup_at && new Date(lead.next_followup_at) < new Date() ? '#ef4444' : 'var(--text3)' }}>
                      {fmtDate(lead.next_followup_at)}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text3)' }}>{fmtDate(lead.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ── TEAM TAB ──────────────────────────────────────────────────────────────

function TeamTab({ filters, onFiltersChange }: {
  filters: ReportFilters
  onFiltersChange: (f: ReportFilters) => void
}) {
  const { data, isLoading } = useTeamReport(filters)
  const { data: branches }  = useReportBranches()
  const user                = useAuthStore(s => s.user)
  const isExecutive         = user?.roles?.includes('executive') && !user?.roles?.includes('owner') && !user?.roles?.includes('manager')

  if (isExecutive) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
        Team performance data is visible to owners and managers only.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <DateRangePicker
          from={filters.date_from ?? ''}
          to={filters.date_to ?? ''}
          onChange={(from, to) => onFiltersChange({ ...filters, date_from: from, date_to: to })}
        />
        <FilterSelect
          value={filters.branch_id ?? ''}
          onChange={v => onFiltersChange({ ...filters, branch_id: v })}
          placeholder="All Branches"
          options={(branches ?? []).map(b => ({ value: b.id, label: b.name }))}
        />
        {Object.values(filters).some(Boolean) && (
          <button
            onClick={() => onFiltersChange({})}
            style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer', padding: '4px 6px' }}
          >
            Clear
          </button>
        )}
      </div>

      <SectionCard title={`Team Performance (${(data?.members ?? []).length} members)`}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4].map(i => <Skeleton key={i} h={36} />)}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
              <thead>
                <tr>
                  {['Name', 'Branch', 'Assigned', 'Converted', 'Conv. Rate', 'Follow-ups Done', 'Follow-up %'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text3)', fontWeight: 500, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.members ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>No team data available</td>
                  </tr>
                ) : (data?.members ?? []).map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border2)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: PURPLE, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                        }}>
                          {m.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 500, color: 'var(--text)' }}>{m.name}</p>
                          <p style={{ margin: 0, fontSize: 11, color: 'var(--text3)' }}>{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text3)' }}>{m.branch_name}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 500 }}>{fmt(m.assigned)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{fmt(m.converted)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        background: m.conversion_rate > 0 ? 'rgba(124,58,237,0.12)' : 'var(--border)',
                        color: m.conversion_rate > 0 ? PURPLE : 'var(--text3)',
                        borderRadius: 6, padding: '2px 8px', fontWeight: 600, fontSize: 12,
                      }}>
                        {m.conversion_rate}%
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{fmt(m.followups_done)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          flex: 1, height: 6, background: 'var(--border)',
                          borderRadius: 3, overflow: 'hidden', minWidth: 60,
                        }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            background: m.followup_pct >= 80 ? '#22c55e' : m.followup_pct >= 50 ? '#f59e0b' : '#ef4444',
                            width: `${m.followup_pct}%`,
                            transition: 'width 0.4s ease',
                          }} />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{m.followup_pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ── SOURCES TAB ───────────────────────────────────────────────────────────

function SourcesTab({ filters, onFiltersChange }: {
  filters: ReportFilters
  onFiltersChange: (f: ReportFilters) => void
}) {
  const { data, isLoading } = useSourcesReport(filters)
  const { data: branches }  = useReportBranches()
  const sources             = data?.sources ?? []
  const totalLeads          = sources.reduce((a, s) => a + s.total, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <DateRangePicker
          from={filters.date_from ?? ''}
          to={filters.date_to ?? ''}
          onChange={(from, to) => onFiltersChange({ ...filters, date_from: from, date_to: to })}
        />
        <FilterSelect
          value={filters.branch_id ?? ''}
          onChange={v => onFiltersChange({ ...filters, branch_id: v })}
          placeholder="All Branches"
          options={(branches ?? []).map(b => ({ value: b.id, label: b.name }))}
        />
        {Object.values(filters).some(Boolean) && (
          <button
            onClick={() => onFiltersChange({})}
            style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer', padding: '4px 6px' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Per-source conversion cards */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}><Skeleton h={12} w="60%" /><div style={{ marginTop: 8 }}><Skeleton h={24} w="40%" /></div></div>)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {sources.map(s => {
            const pct = totalLeads > 0 ? Math.round((s.total / totalLeads) * 100) : 0
            return (
              <div key={s.source} style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '16px 18px',
              }}>
                <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--text3)', textTransform: 'capitalize', fontWeight: 500 }}>{s.source}</p>
                <p style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' }}>{fmt(s.total)}</p>
                <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 2, background: PURPLE, width: `${pct}%` }} />
                </div>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text3)' }}>
                  {pct}% of total · {s.conversion_rate}% conv.
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Source breakdown table */}
      <SectionCard title="Source Breakdown">
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4].map(i => <Skeleton key={i} h={36} />)}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Source', 'Total Leads', '% of Total', 'Converted', 'Conversion Rate'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text3)', fontWeight: 500, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sources.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>No source data available</td>
                  </tr>
                ) : sources.map(s => {
                  const pct = totalLeads > 0 ? Math.round((s.total / totalLeads) * 100) : 0
                  return (
                    <tr key={s.source} style={{ borderBottom: '1px solid var(--border2)' }}>
                      <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 500, textTransform: 'capitalize' }}>{s.source}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{fmt(s.total)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 60, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 3, background: PURPLE, width: `${pct}%` }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--text3)' }}>{pct}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{fmt(s.converted)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          background: s.conversion_rate > 0 ? 'rgba(124,58,237,0.12)' : 'var(--border)',
                          color: s.conversion_rate > 0 ? PURPLE : 'var(--text3)',
                          borderRadius: 6, padding: '2px 8px', fontWeight: 600, fontSize: 12,
                        }}>
                          {s.conversion_rate}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ── MAIN REPORTS VIEW ─────────────────────────────────────────────────────

export default function ReportsView() {
  const [activeTab, setActiveTab]     = useState<Tab>('overview')
  const [filters, setFilters]         = useState<ReportFilters>({})

  const handleFiltersChange = useCallback((f: ReportFilters) => setFilters(f), [])

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'leads',    label: 'Leads' },
    { key: 'team',     label: 'Team' },
    { key: 'sources',  label: 'Sources' },
  ]

  return (
    <>
      {/* Keyframe animations */}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes spin   { to { transform: rotate(360deg) } }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1200 }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>Reports</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text3)' }}>Track performance across leads, team, and sources</p>
          </div>
        </div>

        {/* Tab nav */}
        <div style={{
          display: 'flex',
          gap: 2,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 4,
          overflowX: 'auto',
          flexShrink: 0,
          width: 'fit-content',
        }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setFilters({}) }}
              style={{
                background: activeTab === tab.key ? PURPLE : 'transparent',
                color: activeTab === tab.key ? '#fff' : 'var(--text3)',
                border: 'none',
                borderRadius: 7,
                padding: '7px 18px',
                fontSize: 13,
                fontWeight: activeTab === tab.key ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && <OverviewTab filters={filters} />}
        {activeTab === 'leads'    && <LeadsTab    filters={filters} onFiltersChange={handleFiltersChange} />}
        {activeTab === 'team'     && <TeamTab     filters={filters} onFiltersChange={handleFiltersChange} />}
        {activeTab === 'sources'  && <SourcesTab  filters={filters} onFiltersChange={handleFiltersChange} />}

      </div>
    </>
  )
}