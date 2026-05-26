'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  useLead,
  useChangeStatus,
  useAssignLead,
  useAddNote,
  useSetFollowUp,
  type Activity,
  type LeadDetail,
} from '@/hooks/useLead'
import { useLeadStatuses, useTeamMembers } from '@/hooks/useLeadMeta'
import { useFollowups, useMarkFollowupDone, type Followup } from '@/hooks/useFollowups'

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  const w = name.trim().split(' ')
  if (w.length === 1) return w[0].slice(0, 2).toUpperCase()
  return (w[0][0] + w[1][0]).toUpperCase()
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function isOverdue(iso: string | null): boolean {
  if (!iso) return false
  return new Date(iso) < new Date()
}

function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    website: 'Website', meta: 'Meta Ads', whatsapp: 'WhatsApp',
    manual: 'Manual', api: 'API', qr: 'QR Code',
    instagram: 'Instagram', facebook: 'Facebook', google: 'Google',
  }
  return map[source] ?? source
}

const ACTIVITY_ICONS: Record<string, string> = {
  created:        '✦',
  status_changed: '⇄',
  assignment:     '→',
  note:           '✎',
  call_log:       '☎',
  followup_set:   '⏰',
  whatsapp_sent:  '💬',
  email_sent:     '✉',
  duplicate_merged: '⊕',
}

const ACTIVITY_COLORS: Record<string, string> = {
  created:        '#7c3aed',
  status_changed: '#f59e0b',
  assignment:     '#3b82f6',
  note:           '#6b7280',
  call_log:       '#10b981',
  followup_set:   '#8b5cf6',
  whatsapp_sent:  '#25d366',
  email_sent:     '#6366f1',
  duplicate_merged: '#ef4444',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: '#7c3aed22', border: '1.5px solid #7c3aed55',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 600, color: '#7c3aed',
      flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  )
}

function StatusBadge({ name, color }: { name: string; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      background: color + '18', border: `1px solid ${color}55`,
      fontSize: 12, fontWeight: 600, color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {name}
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>
        {value || <span style={{ color: '#d1d5db' }}>—</span>}
      </span>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid #f3f4f6',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {title}
        </span>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

// ── Action Panel ──────────────────────────────────────────────────────────────

function ActionPanel({ lead }: { lead: LeadDetail }) {
  const [tab, setTab] = useState<'note' | 'status' | 'assign' | 'followup'>('note')
  const [note, setNote]         = useState('')
  const [noteType, setNoteType] = useState('note')
  const [selStatus, setSelStatus] = useState(lead.lead_status_id)
  const [selUser, setSelUser]     = useState(lead.assigned_to ?? '')
  const [followupAt, setFollowupAt] = useState('')
  const [followupNote, setFollowupNote] = useState('')
  const [saving, setSaving]  = useState(false)
  const [success, setSuccess] = useState('')

  const { data: statuses = [] } = useLeadStatuses()
  const { data: team = [] }     = useTeamMembers()

  const addNote      = useAddNote(lead.id)
  const changeStatus = useChangeStatus(lead.id)
  const assignLead   = useAssignLead(lead.id)
  const setFollowUp  = useSetFollowUp(lead.id)

  const flash = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 2500)
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      if (tab === 'note') {
        await addNote.mutateAsync({ note, type: noteType })
        setNote('')
        flash('Note added ✓')
      } else if (tab === 'status') {
        await changeStatus.mutateAsync({ lead_status_id: selStatus })
        flash('Status updated ✓')
      } else if (tab === 'assign') {
        await assignLead.mutateAsync({ user_id: selUser || null })
        flash('Lead assigned ✓')
      } else if (tab === 'followup') {
        await setFollowUp.mutateAsync({ followup_at: followupAt, note: followupNote })
        setFollowupAt('')
        setFollowupNote('')
        flash('Follow-up set ✓')
      }
    } catch {
      // errors handled globally via api.ts
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { key: 'note',     label: '✎ Note' },
    { key: 'status',   label: '⇄ Status' },
    { key: 'assign',   label: '→ Assign' },
    { key: 'followup', label: '⏰ Follow-up' },
  ] as const

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '11px 4px', fontSize: 12, fontWeight: 600,
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: tab === t.key ? '2px solid #7c3aed' : '2px solid transparent',
            color: tab === t.key ? '#7c3aed' : '#6b7280',
            transition: 'color 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab body */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tab === 'note' && (
          <>
            <select value={noteType} onChange={e => setNoteType(e.target.value)} style={selectStyle}>
              <option value="note">📝 Note</option>
              <option value="call_log">📞 Call Log</option>
              <option value="whatsapp_sent">💬 WhatsApp Sent</option>
              <option value="email_sent">✉ Email Sent</option>
            </select>
            <textarea
              value={note} onChange={e => setNote(e.target.value)}
              placeholder="Write a note, call log, or activity..."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </>
        )}

        {tab === 'status' && (
          <select value={selStatus} onChange={e => setSelStatus(e.target.value)} style={selectStyle}>
            {statuses.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}

        {tab === 'assign' && (
          <select value={selUser} onChange={e => setSelUser(e.target.value)} style={selectStyle}>
            <option value="">— Unassigned —</option>
            {team.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
            ))}
          </select>
        )}

        {tab === 'followup' && (
          <>
            <input
              type="datetime-local"
              value={followupAt}
              onChange={e => setFollowupAt(e.target.value)}
              style={inputStyle}
              min={new Date().toISOString().slice(0, 16)}
            />
            <input
              type="text"
              value={followupNote}
              onChange={e => setFollowupNote(e.target.value)}
              placeholder="Optional note for this follow-up..."
              style={inputStyle}
            />
          </>
        )}

        {success && (
          <div style={{
            padding: '8px 12px', borderRadius: 8,
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            color: '#15803d', fontSize: 13, fontWeight: 600,
          }}>
            {success}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving || (tab === 'note' && !note.trim()) || (tab === 'followup' && !followupAt)}
          style={{
            padding: '9px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: saving ? '#d1d5db' : '#7c3aed',
            color: '#fff', fontSize: 13, fontWeight: 600,
            opacity: saving ? 0.7 : 1, transition: 'background 0.15s',
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ── Activity Timeline ─────────────────────────────────────────────────────────

function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (!activities.length) {
    return (
      <div style={{
        textAlign: 'center', padding: '32px 0',
        color: '#9ca3af', fontSize: 13,
      }}>
        No activity yet. Actions on this lead will appear here.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {activities.map((act, i) => {
        const color = ACTIVITY_COLORS[act.type] ?? '#6b7280'
        const icon  = ACTIVITY_ICONS[act.type]  ?? '·'
        const isLast = i === activities.length - 1

        return (
          <div key={act.id} style={{ display: 'flex', gap: 12 }}>
            {/* Timeline spine */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 28 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: color + '15', border: `1.5px solid ${color}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color, flexShrink: 0,
              }}>
                {icon}
              </div>
              {!isLast && (
                <div style={{ width: 1, flex: 1, background: '#e5e7eb', minHeight: 16 }} />
              )}
            </div>

            {/* Content */}
            <div style={{ paddingBottom: isLast ? 0 : 16, flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, justifyContent: 'space-between' }}>
                <p style={{
                  margin: 0, fontSize: 13, color: '#374151',
                  lineHeight: 1.5, wordBreak: 'break-word',
                }}>
                  {act.description}
                </p>
                <span style={{
                  fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2,
                }}>
                  {timeAgo(act.created_at)}
                </span>
              </div>
              {act.user_name && (
                <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, display: 'block' }}>
                  by {act.user_name}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ w = '100%', h = 16, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
      backgroundSize: '200% 100%',
      animation: 'pulse 1.4s ease-in-out infinite',
    }} />
  )
}

// ── Style constants ───────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1.5px solid #e5e7eb', fontSize: 13, color: '#111827',
  outline: 'none', background: '#fafafa', boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: 'pointer',
}


function FollowupHistory({ leadId }: { leadId: string }) {
  const { data: followups = [], isLoading } = useFollowups(leadId)
  const markDone = useMarkFollowupDone(leadId)

  if (isLoading) return null
  if (!followups.length) return null

  const statusColors: Record<string, string> = {
    pending: '#f59e0b',
    done:    '#10b981',
    missed:  '#ef4444',
  }

  const statusLabels: Record<string, string> = {
    pending: '⏰ Pending',
    done:    '✅ Done',
    missed:  '🔴 Missed',
  }

  return (
    <SectionCard title={`Follow-ups (${followups.length})`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {followups.map((f: Followup) => {
          const overdue = f.status === 'pending' && new Date(f.follow_up_at) < new Date()
          const color   = overdue ? '#ef4444' : statusColors[f.status]
          return (
            <div key={f.id} style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              gap: 12, padding: '10px 12px', borderRadius: 8,
              background: overdue ? '#fff5f5' : '#fafafa',
              border: `1px solid ${overdue ? '#fecaca' : '#e5e7eb'}`,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color }}>
                  {overdue ? '🔴 Overdue' : statusLabels[f.status]}
                  <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>
                    {fmtDateTime(f.follow_up_at)}
                  </span>
                </div>
                {f.note && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>
                    {f.note}
                  </div>
                )}
              </div>
              {f.status === 'pending' && (
                <button
                  onClick={() => markDone.mutate(f.id)}
                  disabled={markDone.isPending}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: '1px solid #bbf7d0',
                    background: '#f0fdf4', color: '#15803d', fontSize: 12,
                    fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  Mark Done
                </button>
              )}
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LeadDetailView({ leadId }: { leadId: string }) {
  const router = useRouter()
  const { data: lead, isLoading, isError } = useLead(leadId)

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <style>{`@keyframes pulse { 0%,100%{background-position:200% 0} 50%{background-position:0% 0} }`}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={backBtnStyle}>← Back</button>
          <Skeleton w={200} h={24} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Skeleton h={14} w={100} />
                <Skeleton h={16} />
                <Skeleton h={16} w="70%" />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, height: 200 }} />
          </div>
        </div>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (isError || !lead) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <p style={{ color: '#6b7280', fontSize: 14 }}>Lead not found or you don&apos;t have access.</p>
        <button onClick={() => router.push('/leads')} style={{ ...backBtnStyle, marginTop: 16 }}>
          ← Back to Leads
        </button>
      </div>
    )
  }

  const followupOverdue = isOverdue(lead.next_followup_at)

  return (
    <div style={{ padding: '0 0 48px 0', display: 'flex', flexDirection: 'column', gap: 0 }}>
      <style>{`
        @keyframes pulse { 0%,100%{background-position:200% 0} 50%{background-position:0% 0} }
        input:focus, select:focus, textarea:focus {
          outline: none !important;
          border-color: #7c3aed !important;
          box-shadow: 0 0 0 3px #7c3aed18 !important;
        }
      `}</style>

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '20px 24px', borderBottom: '1px solid #f3f4f6',
        background: '#fff',
      }}>
        <button onClick={() => router.push('/leads')} style={backBtnStyle}>
          ← Leads
        </button>
        <div style={{ width: 1, height: 20, background: '#e5e7eb' }} />

        <Avatar name={lead.name} size={38} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
              {lead.name}
            </h1>
            {lead.is_duplicate && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#ef4444',
                background: '#fef2f2', border: '1px solid #fecaca',
                padding: '1px 7px', borderRadius: 10,
              }}>DUP</span>
            )}
            {lead.status && <StatusBadge name={lead.status.name} color={lead.status.color} />}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            {lead.mobile} {lead.email ? `· ${lead.email}` : ''} {lead.city ? `· ${lead.city}` : ''}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <a href={`tel:${lead.mobile}`} style={actionChipStyle('call')}>☎ Call</a>
          <a
            href={`https://wa.me/${lead.mobile.replace(/\D/g, '')}`}
            target="_blank" rel="noreferrer"
            style={actionChipStyle('wa')}
          >
            💬 WhatsApp
          </a>
        </div>
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 340px',
        gap: 20,
        padding: '20px 24px',
        alignItems: 'start',
      }}>

        {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Lead Info */}
          <SectionCard title="Lead Information">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <InfoRow label="Source" value={sourceLabel(lead.source)} />
              <InfoRow label="Interested In" value={lead.interested_in} />
              <InfoRow label="Lead Value" value={lead.lead_value ? `₹${lead.lead_value.toLocaleString('en-IN')}` : null} />
              <InfoRow label="Campaign" value={lead.campaign} />
              <InfoRow label="City" value={lead.city} />
              <InfoRow label="Created" value={fmtDate(lead.created_at)} />
              {lead.converted_at && (
                <InfoRow label="Converted" value={fmtDate(lead.converted_at)} />
              )}
              {lead.lost_reason && (
                <InfoRow label="Lost Reason" value={lead.lost_reason} />
              )}
            </div>
            {lead.tags && lead.tags.length > 0 && (
              <div style={{ marginTop: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {lead.tags.map((tag, i) => (
                  <span key={i} style={{
                    fontSize: 11, padding: '3px 10px', borderRadius: 20,
                    background: '#f3f4f6', color: '#374151', fontWeight: 500,
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Follow-up History */}
          <FollowupHistory leadId={leadId} />

          {/* Activity Timeline */}
          <SectionCard title={`Activity Timeline (${lead.activities?.length ?? 0})`}>
            <ActivityTimeline activities={lead.activities ?? []} />
          </SectionCard>
        </div>

        {/* ── RIGHT COLUMN ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Quick actions */}
          <ActionPanel lead={lead} />

          {/* Assignment info */}
          <SectionCard title="Assigned To">
            {lead.assigned_user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={lead.assigned_user.name} size={36} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                    {lead.assigned_user.name}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#9ca3af', fontSize: 13 }}>
                Not assigned — use the Assign tab above.
              </div>
            )}
          </SectionCard>

          {/* Custom fields */}
          {lead.custom_fields && Object.keys(lead.custom_fields).length > 0 && (
            <SectionCard title="Custom Fields">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(lead.custom_fields).map(([key, val]) => (
                  <InfoRow key={key} label={key} value={String(val)} />
                ))}
              </div>
            </SectionCard>
          )}

          {/* Metadata (debug — only shows if metadata has content) */}
          {lead.source === 'api' && lead.metadata && Object.keys(lead.metadata).length > 0 && (
            <SectionCard title="Source Metadata">
              <pre style={{
                margin: 0, fontSize: 11, color: '#6b7280',
                whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                background: '#f9fafb', borderRadius: 6, padding: 10,
              }}>
                {JSON.stringify(lead.metadata, null, 2)}
              </pre>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Style helpers ─────────────────────────────────────────────────────────────

const backBtnStyle: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 8,
  background: '#f3f4f6', border: 'none', cursor: 'pointer',
  fontSize: 13, fontWeight: 600, color: '#374151',
  textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
}

function actionChipStyle(type: 'call' | 'wa'): React.CSSProperties {
  const isWa = type === 'wa'
  return {
    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5,
    background: isWa ? '#dcfce7' : '#eff6ff',
    color: isWa ? '#15803d' : '#1d4ed8',
    border: `1px solid ${isWa ? '#bbf7d0' : '#bfdbfe'}`,
    cursor: 'pointer',
  }
}