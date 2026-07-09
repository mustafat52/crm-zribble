'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLeadStatuses } from '@/hooks/useLeadMeta'
import { useLeads, type LeadFilters, type Lead } from '@/hooks/useLeads'
import { api } from '@/lib/api'

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const SOURCES = ['Website', 'Facebook', 'Instagram', 'Google', 'Referral', 'Walk-in', 'Other']

// ─── ExportButton ─────────────────────────────────────────────────────────────

function ExportButton({ filters }: { filters: LeadFilters }) {
  const [exporting, setExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const downloadedRef = useRef(false)

  const startExport = async () => {
  downloadedRef.current = false
  setExporting(true)
  setExportStatus('queued')

  try {
    const params = new URLSearchParams()
    if (filters.status_id) params.set('status_id', filters.status_id)
    if (filters.source)    params.set('source', filters.source)
    if (filters.date_from) params.set('date_from', filters.date_from)
    if (filters.date_to)   params.set('date_to', filters.date_to)

    const data = await api.post<{ export_id: string }>(
      `/reports/exports?${params.toString()}`,
      {}
    )
    const exportId = data.export_id

    pollRef.current = setInterval(async () => {
      try {
        const statusData = await api.get<{ status: string; url: string }>(
          `/reports/exports/${exportId}/status`
        )
        setExportStatus(statusData.status)

        if (statusData.status === 'ready') {
          if (downloadedRef.current) return
          downloadedRef.current = true
          clearInterval(pollRef.current!)
          setExporting(false)
          const token = localStorage.getItem('auth-storage')
          const parsed = token ? JSON.parse(token) : null
          const bearerToken = parsed?.state?.token ?? null
          const dlRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/reports/exports/${exportId}/download`,
            { headers: { Authorization: `Bearer ${bearerToken}` } }
          )
          const blob = await dlRes.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `leads-export-${new Date().toLocaleDateString('en-IN')}.xlsx`
          a.click()
          URL.revokeObjectURL(url)
          setTimeout(() => setExportStatus(null), 3000)
        } else if (statusData.status === 'failed') {
          clearInterval(pollRef.current!)
          setExporting(false)
        }
      } catch {
        clearInterval(pollRef.current!)
        setExporting(false)
        setExportStatus('failed')
      }
    }, 2000)

  } catch {
    setExporting(false)
    setExportStatus('failed')
  }
}
  return (
    <button
      onClick={startExport}
      disabled={exporting}
      title="Export leads to Excel"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '8px 14px',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border2)',
        background: 'var(--bg)',
        color: exporting ? 'var(--accent)' : 'var(--text2)',
        fontSize: 13,
        fontWeight: 500,
        cursor: exporting ? 'not-allowed' : 'pointer',
        opacity: exporting ? 0.8 : 1,
        transition: 'all var(--transition)',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { if (!exporting) e.currentTarget.style.background = 'var(--bg3)' }}
      onMouseLeave={e => { if (!exporting) e.currentTarget.style.background = 'var(--bg)' }}
    >
      {exporting ? (
        <>
          {/* spinner */}
          <svg
            style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
            width="14" height="14" viewBox="0 0 24 24" fill="none"
          >
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span>{exportStatus === 'queued' ? 'Queuing…' : 'Generating…'}</span>
        </>
      ) : (
        <>
          {/* download icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span style={{ color: exportStatus === 'failed' ? '#dc2626' : undefined }}>
            {exportStatus === 'failed' ? 'Failed — Retry' : 'Export Excel'}
          </span>
        </>
      )}
    </button>
  )
}

// ─── sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Lead['status'] }) {
  if (!status) return <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>

  const bg = status.color + '1f'

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 9px',
      borderRadius: 99,
      fontSize: 11,
      fontWeight: 600,
      background: bg,
      color: status.color,
      border: `1px solid ${status.color}33`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: status.color, flexShrink: 0,
      }} />
      {status.name}
    </span>
  )
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} style={{ padding: '12px 16px' }}>
          <div style={{
            height: 13,
            borderRadius: 4,
            background: 'var(--bg3)',
            width: i === 0 ? '70%' : i === 2 ? '60%' : '50%',
            animation: 'pulse 1.4s ease-in-out infinite',
          }} />
        </td>
      ))}
    </tr>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

export default function LeadsListView() {
  const router = useRouter()
  const { data: leadStatuses = [] } = useLeadStatuses()
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)

  const [filters, setFilters] = useState<LeadFilters>({})

  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearch || undefined, page: 1 }))
  }, [debouncedSearch])

  const { leads, pagination, isLoading, isError } = useLeads(filters)

  const hasActiveFilters =
    !!filters.search || !!filters.status_id || !!filters.source ||
    !!filters.date_from || !!filters.date_to

  const handleFilter = useCallback((key: keyof LeadFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined, page: 1 }))
  }, [])

  const clearFilters = useCallback(() => {
    setSearchInput('')
    setFilters({})
  }, [])

  const goToPage = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }, [])

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>

      {/* ── page header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px 16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>
            All Leads
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>
            {pagination ? `${pagination.total.toLocaleString()} leads total` : 'Loading…'}
          </p>
        </div>

        {/* ── header actions: Export + Add Lead ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ExportButton filters={filters} />

          <button
            onClick={() => router.push('/leads/new')}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 16px',
              borderRadius: 'var(--radius)',
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background var(--transition)',
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            Add lead
          </button>
        </div>
      </div>

      {/* ── filters bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>

        {/* search */}
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 300 }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text3)', fontSize: 14, pointerEvents: 'none',
          }}>⌕</span>
          <input
            type="text"
            placeholder="Search name, mobile, email…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px 7px 30px',
              border: '1px solid var(--border2)',
              borderRadius: 'var(--radius)',
              background: 'var(--bg)',
              color: 'var(--text)',
              fontSize: 13,
              outline: 'none',
              transition: 'border-color var(--transition)',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border2)'}
          />
        </div>

        {/* status */}
        <FilterSelect
          value={filters.status_id ?? ''}
          onChange={v => handleFilter('status_id', v)}
          placeholder="All statuses"
          options={leadStatuses.map(s => ({ value: s.id, label: s.name }))}
/>

        {/* source */}
        <FilterSelect
          value={filters.source ?? ''}
          onChange={v => handleFilter('source', v)}
          placeholder="All sources"
          options={SOURCES.map(s => ({ value: s, label: s }))}
        />

        {/* date from */}
        <input
          type="date"
          value={filters.date_from ?? ''}
          onChange={e => handleFilter('date_from', e.target.value)}
          style={dateInputStyle}
          title="From date"
        />

        {/* date to */}
        <input
          type="date"
          value={filters.date_to ?? ''}
          onChange={e => handleFilter('date_to', e.target.value)}
          style={dateInputStyle}
          title="To date"
        />

        {/* clear */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            style={{
              padding: '7px 13px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border2)',
              background: 'transparent',
              color: 'var(--text2)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all var(--transition)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--bg3)'
              e.currentTarget.style.color = 'var(--text)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text2)'
            }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* ── table area ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.45; }
          }
          .leads-row:hover td {
            background: var(--bg3);
          }
        `}</style>

        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          minWidth: 820,
        }}>
          <colgroup>
            <col style={{ width: '22%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '14%' }} />
          </colgroup>

          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Name & Mobile', 'Source', 'Status', 'Assigned to', 'City', 'Created', 'Follow-up'].map(h => (
                <th key={h} style={{
                  padding: '10px 16px',
                  textAlign: 'left',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  background: 'var(--bg2)',
                  position: 'sticky', top: 0, zIndex: 1,
                  borderBottom: '1px solid var(--border)',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {isLoading && Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}

            {isError && !isLoading && (
              <tr>
                <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
                  <div style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 500 }}>
                    Failed to load leads
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
                    Check your connection or try refreshing
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && !isError && leads.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '64px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)' }}>
                    {hasActiveFilters ? 'No leads match your filters' : 'No leads yet'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 6 }}>
                    {hasActiveFilters
                      ? 'Try adjusting or clearing your filters'
                      : 'Add your first lead to get started'}
                  </div>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      style={{
                        marginTop: 16,
                        padding: '8px 18px',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border2)',
                        background: 'transparent',
                        color: 'var(--text2)',
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      Clear filters
                    </button>
                  )}
                </td>
              </tr>
            )}

            {!isLoading && leads.map(lead => (
              <LeadRow
                key={lead.id}
                lead={lead}
                onClick={() => router.push(`/leads/${lead.id}`)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* ── pagination ── */}
      {pagination && pagination.lastPage > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 24px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>
            Page {pagination.currentPage} of {pagination.lastPage}
            {' · '}{pagination.total.toLocaleString()} leads
          </span>

          <div style={{ display: 'flex', gap: 6 }}>
            <PaginationBtn
              label="← Prev"
              disabled={!pagination.hasPrev}
              onClick={() => goToPage(pagination.currentPage - 1)}
            />

            {buildPageRange(pagination.currentPage, pagination.lastPage).map((p, i) =>
              p === '…'
                ? <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: 'var(--text3)', lineHeight: '30px' }}>…</span>
                : (
                  <button
                    key={p}
                    onClick={() => goToPage(p as number)}
                    style={{
                      width: 32, height: 32,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid',
                      borderColor: p === pagination.currentPage ? 'var(--accent)' : 'var(--border2)',
                      background: p === pagination.currentPage ? 'var(--accent-bg)' : 'transparent',
                      color: p === pagination.currentPage ? 'var(--accent)' : 'var(--text2)',
                      fontSize: 13,
                      fontWeight: p === pagination.currentPage ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all var(--transition)',
                    }}
                  >
                    {p}
                  </button>
                )
            )}

            <PaginationBtn
              label="Next →"
              disabled={!pagination.hasNext}
              onClick={() => goToPage(pagination.currentPage + 1)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── LeadRow ─────────────────────────────────────────────────────────────────

function LeadRow({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  return (
    <tr
      className="leads-row"
      onClick={onClick}
      style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background var(--transition)' }}
    >
      <td style={{ padding: '11px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {lead.name}
              {lead.is_duplicate && (
                <span title="Duplicate lead" style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: 99,
                  background: '#fef9c3',
                  color: '#a16207',
                  border: '1px solid #fde047',
                  letterSpacing: '0.3px',
                }}>DUP</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
              {lead.mobile}
            </div>
          </div>
        </div>
      </td>

      <td style={{ padding: '11px 16px' }}>
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>
          {lead.source ?? '—'}
        </span>
      </td>

      <td style={{ padding: '11px 16px' }}>
        <StatusBadge status={lead.status} />
      </td>

      <td style={{ padding: '11px 16px' }}>
        {lead.assignedTo ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
              width: 24, height: 24,
              borderRadius: '50%',
              background: 'var(--accent-bg)',
              border: '1px solid var(--accent-border)',
              color: 'var(--accent)',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {lead.assignedTo.name.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 13, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lead.assignedTo.name}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>Unassigned</span>
        )}
      </td>

      <td style={{ padding: '11px 16px' }}>
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>{lead.city ?? '—'}</span>
      </td>

      <td style={{ padding: '11px 16px' }}>
        <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
          {formatDate(lead.created_at)}
        </span>
      </td>

      <td style={{ padding: '11px 16px' }}>
        <FollowUpCell date={lead.next_followup_at} />
      </td>
    </tr>
  )
}

// ─── FollowUpCell ─────────────────────────────────────────────────────────────

function FollowUpCell({ date }: { date: string | null }) {
  if (!date) return <span style={{ fontSize: 13, color: 'var(--text3)' }}>—</span>

  const d = new Date(date)
  const now = new Date()
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isOverdue = diffDays < 0
  const isToday = diffDays === 0
  const isSoon = diffDays > 0 && diffDays <= 2

  let color = 'var(--text3)'
  let bg = 'transparent'
  let border = 'transparent'

  if (isOverdue) { color = '#dc2626'; bg = '#fef2f2'; border = '#fca5a5' }
  else if (isToday) { color = '#d97706'; bg = '#fffbeb'; border = '#fcd34d' }
  else if (isSoon) { color = '#2563eb'; bg = '#eff6ff'; border = '#93c5fd' }

  return (
    <span style={{
      fontSize: 11,
      fontFamily: 'var(--font-mono)',
      fontWeight: 500,
      padding: '3px 8px',
      borderRadius: 99,
      color,
      background: bg,
      border: `1px solid ${border}`,
      whiteSpace: 'nowrap',
    }}>
      {isOverdue
        ? `${Math.abs(diffDays)}d overdue`
        : isToday
          ? 'Today'
          : formatDate(date)}
    </span>
  )
}

// ─── FilterSelect ─────────────────────────────────────────────────────────────

function FilterSelect({
  value, onChange, placeholder, options,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '7px 10px',
        border: '1px solid var(--border2)',
        borderRadius: 'var(--radius)',
        background: 'var(--bg)',
        color: value ? 'var(--text)' : 'var(--text3)',
        fontSize: 13,
        cursor: 'pointer',
        outline: 'none',
        minWidth: 140,
        transition: 'border-color var(--transition)',
      }}
      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
      onBlur={e => e.target.style.borderColor = 'var(--border2)'}
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

// ─── PaginationBtn ────────────────────────────────────────────────────────────

function PaginationBtn({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 12px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border2)',
        background: 'transparent',
        color: disabled ? 'var(--text3)' : 'var(--text2)',
        fontSize: 13,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all var(--transition)',
      }}
    >
      {label}
    </button>
  )
}

// ─── page range builder ───────────────────────────────────────────────────────

function buildPageRange(current: number, last: number): (number | '…')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)
  const pages: (number | '…')[] = []
  const addPage = (p: number) => { if (!pages.includes(p)) pages.push(p) }
  addPage(1)
  if (current > 3) pages.push('…')
  for (let p = Math.max(2, current - 1); p <= Math.min(last - 1, current + 1); p++) addPage(p)
  if (current < last - 2) pages.push('…')
  addPage(last)
  return pages
}

// ─── shared styles ────────────────────────────────────────────────────────────

const dateInputStyle: React.CSSProperties = {
  padding: '7px 10px',
  border: '1px solid var(--border2)',
  borderRadius: 'var(--radius)',
  background: 'var(--bg)',
  color: 'var(--text2)',
  fontSize: 13,
  cursor: 'pointer',
  outline: 'none',
}