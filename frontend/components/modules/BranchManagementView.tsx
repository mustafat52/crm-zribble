'use client'

import { useState } from 'react'
import {
  useBranches,
  useCreateBranch,
  useUpdateBranch,
  useToggleBranch,
  useDeleteBranch,
  useSwitchBranch,
  useBranchDetail,
  type Branch,
  type BranchOverall,
  type BranchPayload,
  type BranchStaffMember,
} from '@/hooks/useBranches'
import { useAuthStore } from '@/store/useAuthStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMinutes(mins: number | null): string {
  if (mins === null || mins === undefined) return '—'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconMapPin = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)
const IconPhone = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1 19.79 19.79 0 0 1 1.62 4.48 2 2 0 0 1 3.6 2.28h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.92 17z" />
  </svg>
)
const IconLock = () => (
  <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" />
  </svg>
)
const IconEdit = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

// ── KPI Cards ─────────────────────────────────────────────────────────────────

function KpiCards({ overall, isLoading }: { overall: BranchOverall | null; isLoading: boolean }) {
  const cards = [
    {
      label: 'Total Leads',
      value: overall ? overall.total_leads.toLocaleString('en-IN') : '—',
      icon: '📋',
      color: '#7c3aed',
    },
    {
      label: 'Conversion Rate',
      value: overall ? `${overall.conversion_rate}%` : '—',
      icon: '🎯',
      color: '#10b981',
    },
    {
      label: 'Overdue Follow-ups',
      value: overall ? overall.pending_followups.toLocaleString('en-IN') : '—',
      icon: '⏰',
      color: overall && overall.pending_followups > 0 ? '#ef4444' : '#6b7280',
    },
    {
      label: 'Avg Response Time',
      value: overall ? fmtMinutes(overall.avg_response_minutes) : '—',
      icon: '⚡',
      color: '#f59e0b',
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {cards.map((card) => (
        <div
          key={card.label}
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '18px 20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {isLoading ? (
            <>
              <div style={skeletonStyle(28, '50%')} />
              <div style={{ ...skeletonStyle(14, '70%'), marginTop: 8 }} />
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>{card.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {card.label}
                </span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: card.color, lineHeight: 1 }}>
                {card.value}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

const MEDALS = [
  { emoji: '🥇', label: '1st', bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '#f59e0b', text: '#92400e' },
  { emoji: '🥈', label: '2nd', bg: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', border: '#94a3b8', text: '#475569' },
  { emoji: '🥉', label: '3rd', bg: 'linear-gradient(135deg, #fef4ec, #fed7aa)', border: '#f97316', text: '#9a3412' },
]

function Leaderboard({ branches, isLoading }: { branches: Branch[]; isLoading: boolean }) {
  const top3 = [...branches]
    .filter(b => b.is_active)
    .sort((a, b) => b.conversion_ratio - a.conversion_ratio)
    .slice(0, 3)

  return (
    <div style={{
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '20px',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        🏆 <span>Best Performing Branches</span>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => <div key={i} style={skeletonStyle(56, '100%', 8)} />)}
        </div>
      ) : top3.length === 0 ? (
        <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
          No branch data yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {top3.map((branch, i) => {
            const medal = MEDALS[i]
            const pct   = branch.total_leads > 0
              ? `${Math.round(branch.conversion_ratio * 100)}%`
              : '0%'

            return (
              <div
                key={branch.id}
                style={{
                  background: medal.bg,
                  border: `1px solid ${medal.border}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 24, flexShrink: 0 }}>{medal.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: medal.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {branch.name}
                  </div>
                  <div style={{ fontSize: 11, color: medal.text, opacity: 0.8, marginTop: 2 }}>
                    {branch.total_leads} leads · {branch.converted_leads} converted
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: medal.text, flexShrink: 0 }}>
                  {pct}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Branch Card ───────────────────────────────────────────────────────────────

function BranchCard({
  branch,
  isCurrentBranch,
  onEdit,
  onSwitch,
  onDeactivate,
  onDelete,
}: {
  branch: Branch
  isCurrentBranch: boolean
  onEdit: () => void
  onSwitch: () => void
  onDeactivate: () => void
  onDelete: () => void
}) {
  const avatarText = initials(branch.name)
  const convPct = branch.total_leads > 0
    ? `${Math.round(branch.conversion_ratio * 100)}%`
    : '—'

  return (
    <div style={{
      background: 'var(--bg)',
      border: isCurrentBranch ? '2px solid var(--accent)' : '1px solid var(--border)',
      borderRadius: 12,
      padding: 20,
      boxShadow: isCurrentBranch ? '0 0 0 3px var(--accent-bg)' : 'var(--shadow-sm)',
      opacity: branch.is_active ? 1 : 0.6,
      position: 'relative',
      transition: 'box-shadow 0.2s',
    }}>
      {/* Current badge */}
      {isCurrentBranch && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          fontSize: 10, fontWeight: 700, color: 'var(--accent)',
          background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
          borderRadius: 20, padding: '2px 8px', letterSpacing: '0.04em',
        }}>
          CURRENT
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: isCurrentBranch ? 'var(--accent)' : 'var(--bg3)',
          color: isCurrentBranch ? '#fff' : 'var(--text2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 15, flexShrink: 0,
        }}>
          {avatarText}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 600, fontSize: 15, color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            paddingRight: isCurrentBranch ? 60 : 0,
          }}>
            {branch.name}
          </div>
          <span style={{
            display: 'inline-block', fontSize: 11, fontWeight: 600,
            padding: '2px 8px', borderRadius: 20, marginTop: 3,
            background: branch.is_active ? '#dcfce7' : '#f3f4f6',
            color: branch.is_active ? '#16a34a' : '#6b7280',
          }}>
            {branch.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {branch.city && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text2)' }}>
            <IconMapPin /> {branch.city}
          </div>
        )}
        {branch.whatsapp_number && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text2)' }}>
            <IconPhone /> {branch.whatsapp_number}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex', gap: 12,
        padding: '10px 0',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        marginBottom: 14,
      }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{branch.total_leads}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leads</div>
        </div>
        <div style={{ width: 1, background: 'var(--border)' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>{branch.converted_leads}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Converted</div>
        </div>
        <div style={{ width: 1, background: 'var(--border)' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{convPct}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Conv. Rate</div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <ActionBtn onClick={onEdit} label="Edit" icon={<IconEdit />} />

        <ActionBtn
          onClick={onSwitch}
          label="Switch"
          disabled={isCurrentBranch || !branch.is_active}
          color={isCurrentBranch ? undefined : 'var(--accent)'}
          title={isCurrentBranch ? 'Already on this branch' : 'Switch to this branch'}
        />

        <ActionBtn
          onClick={onDeactivate}
          label={branch.is_active ? 'Deactivate' : 'Activate'}
          color={branch.is_active ? '#f59e0b' : '#16a34a'}
        />

        <ActionBtn
          onClick={onDelete}
          label="Delete"
          color="#ef4444"
        />
      </div>
    </div>
  )
}

function ActionBtn({
  label, onClick, disabled = false, color, icon, title,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  color?: string
  icon?: React.ReactNode
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '5px 10px', fontSize: 12, fontWeight: 500,
        border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        background: 'transparent',
        color: disabled ? 'var(--text3)' : (color ?? 'var(--text2)'),
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'var(--transition)',
      }}
    >
      {icon} {label}
    </button>
  )
}

// ── Edit Branch Modal ─────────────────────────────────────────────────────────

function EditBranchModal({
  branch,
  onClose,
  onSave,
  isSaving,
}: {
  branch: Branch
  onClose: () => void
  onSave: (payload: Partial<BranchPayload>) => void
  isSaving: boolean
}) {
  const [name,     setName]     = useState(branch.name)
  const [city,     setCity]     = useState(branch.city ?? '')
  const [whatsapp, setWhatsapp] = useState(branch.whatsapp_number ?? '')
  const [error,    setError]    = useState('')

  const { data, isLoading: staffLoading } = useBranchDetail(branch.id)

  const handleSave = () => {
    if (!name.trim()) { setError('Branch name is required.'); return }
    onSave({
      name:             name.trim(),
      city:             city.trim() || undefined,
      whatsapp_number:  whatsapp.trim() || undefined,
    })
  }

  return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, maxWidth: 560 }}>
        {/* Header */}
        <div style={modalHeaderStyle}>
          <span style={modalTitleStyle}>Edit Branch</span>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Branch details form */}
        <div style={{ marginBottom: 24 }}>
          <div style={sectionLabelStyle}>Branch Details</div>

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Branch Name *</label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              style={{ ...inputStyle, borderColor: error ? '#ef4444' : undefined }}
              placeholder="e.g. Andheri West"
            />
            {error && <span style={{ fontSize: 12, color: '#ef4444', marginTop: 4, display: 'block' }}>{error}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>City</label>
              <input
                value={city}
                onChange={e => setCity(e.target.value)}
                style={inputStyle}
                placeholder="e.g. Mumbai"
              />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>WhatsApp Number</label>
              <input
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                style={inputStyle}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
        </div>

        {/* Staff list — read only */}
        <div>
          <div style={sectionLabelStyle}>Staff in this Branch</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>
            To add or remove staff, go to Settings → Team.
          </div>

          {staffLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map(i => <div key={i} style={skeletonStyle(36, '100%', 6)} />)}
            </div>
          ) : !data?.staff?.length ? (
            <div style={{
              padding: '16px', borderRadius: 8,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              fontSize: 13, color: 'var(--text3)', textAlign: 'center',
            }}>
              No staff assigned to this branch yet.
            </div>
          ) : (
            <div style={{
              border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
              maxHeight: 220, overflowY: 'auto',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
                    {['Name', 'Role', 'Email', 'Phone'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '8px 12px',
                        fontSize: 11, fontWeight: 600, color: 'var(--text3)',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.staff.map((s: BranchStaffMember) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 500, color: 'var(--text)' }}>{s.name}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <RoleBadge role={s.role} />
                      </td>
                      <td style={{ padding: '9px 12px', color: 'var(--text2)' }}>{s.email}</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text2)' }}>{s.phone ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button style={ghostBtnStyle} onClick={onClose} disabled={isSaving}>Cancel</button>
          <button style={primaryBtnStyle} onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    owner: '#7c3aed', manager: '#1d4ed8', executive: '#0369a1', 'read-only': '#6b7280',
  }
  const c = colors[role] ?? '#6b7280'
  return (
    <span style={{
      padding: '1px 7px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: c + '1a', color: c, textTransform: 'capitalize',
    }}>
      {role}
    </span>
  )
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────────

type ConfirmType = 'switch' | 'deactivate' | 'delete'

const CONFIRM_CONFIG: Record<ConfirmType, {
  title: string
  messageFn: (name: string, isActive: boolean) => string
  confirmLabel: string
  danger: boolean
}> = {
  switch: {
    title: 'Switch Branch',
    messageFn: (name) => `Switch your active view to "${name}"? Your dashboard and reports will show this branch's data.`,
    confirmLabel: 'Switch',
    danger: false,
  },
  deactivate: {
    title: 'Change Branch Status',
    messageFn: (name, isActive) =>
      isActive
        ? `Deactivate "${name}"? Staff assigned to this branch will lose access.`
        : `Reactivate "${name}"? Staff assigned to this branch will regain access.`,
    confirmLabel: 'Confirm',
    danger: false,
  },
  delete: {
    title: 'Delete Branch',
    messageFn: (name) => `Permanently delete "${name}"? This cannot be undone. Leads assigned to this branch will not be deleted but will have no branch.`,
    confirmLabel: 'Delete',
    danger: true,
  },
}

function ConfirmDialog({
  type,
  branch,
  onConfirm,
  onClose,
  isPending,
}: {
  type: ConfirmType
  branch: Branch
  onConfirm: () => void
  onClose: () => void
  isPending: boolean
}) {
  const cfg = CONFIRM_CONFIG[type]

  return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, maxWidth: 420 }}>
        <div style={modalHeaderStyle}>
          <span style={modalTitleStyle}>{cfg.title}</span>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>
        <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6, margin: '12px 0 24px' }}>
          {cfg.messageFn(branch.name, branch.is_active)}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button style={ghostBtnStyle} onClick={onClose} disabled={isPending}>Cancel</button>
          <button
            style={{
              ...primaryBtnStyle,
              background: cfg.danger ? '#ef4444' : 'var(--accent)',
            }}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? 'Please wait…' : cfg.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Skeleton & Loading ─────────────────────────────────────────────────────────

function skeletonStyle(height: number, width: string | number, borderRadius = 4): React.CSSProperties {
  return {
    height,
    width,
    background: 'var(--bg3)',
    borderRadius,
    animation: 'pulse 1.4s ease-in-out infinite',
  }
}

function BranchCardSkeleton() {
  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 20,
    }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <div style={skeletonStyle(44, 44, 10)} />
        <div style={{ flex: 1 }}>
          <div style={skeletonStyle(16, '60%')} />
          <div style={{ ...skeletonStyle(12, '30%'), marginTop: 6 }} />
        </div>
      </div>
      <div style={skeletonStyle(12, '50%')} />
      <div style={{ ...skeletonStyle(12, '40%'), marginTop: 8 }} />
      <div style={{ ...skeletonStyle(40, '100%', 8), marginTop: 14 }} />
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function BranchManagementView() {
  // ── All hooks unconditionally ──────────────────────────────────────────────
  const user       = useAuthStore(s => s.user)
  const setAuth    = useAuthStore(s => s.setAuth)
  const token      = useAuthStore(s => s.token)
  const isHydrated = useAuthStore(s => s._hasHydrated)
  const isOwner    = (user?.roles ?? []).includes('owner')

  const { branches, total, overall, isLoading, isError } = useBranches()
  const createBranch  = useCreateBranch()
  const updateBranch  = useUpdateBranch()
  const toggleBranch  = useToggleBranch()
  const deleteBranch  = useDeleteBranch()
  const switchBranch  = useSwitchBranch()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editBranch,      setEditBranch]      = useState<Branch | null>(null)
  const [confirmState,    setConfirmState]    = useState<{ type: ConfirmType; branch: Branch } | null>(null)

  const activeBranchId = user?.active_branch_id

  // ── Early returns after all hooks ─────────────────────────────────────────
  if (!isHydrated) return null

  if (!isOwner) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 24px', color: 'var(--text2)' }}>
        <IconLock />
        <h3 style={{ margin: '16px 0 8px', fontSize: 18, fontWeight: 600 }}>Owner Access Only</h3>
        <p style={{ color: 'var(--text2)', fontSize: 14, maxWidth: 320, textAlign: 'center' }}>
          Branch management is restricted to the account owner.
        </p>
      </div>
    )
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (!confirmState) return
    const { type, branch } = confirmState

    try {
      if (type === 'switch') {
        const res = await switchBranch.mutateAsync(branch.id)
        if (user && token) {
          setAuth(token, { ...user, active_branch_id: res.active_branch_id })
        }
      } else if (type === 'deactivate') {
        await toggleBranch.mutateAsync(branch.id)
      } else if (type === 'delete') {
        await deleteBranch.mutateAsync(branch.id)
        // If deleted branch was active, reset
        if (activeBranchId === branch.id && user && token) {
          setAuth(token, { ...user, active_branch_id: null })
        }
      }
    } finally {
      setConfirmState(null)
    }
  }

  const handleSaveEdit = async (payload: Partial<BranchPayload>) => {
    if (!editBranch) return
    await updateBranch.mutateAsync({ id: editBranch.id, payload })
    setEditBranch(null)
  }

  const handleCreateSave = async (payload: BranchPayload) => {
    await createBranch.mutateAsync(payload)
    setShowCreateModal(false)
  }

  const isPending = switchBranch.isPending || toggleBranch.isPending || deleteBranch.isPending

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '28px 28px 64px', maxWidth: 1200 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Branches</h1>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>
            {isLoading ? 'Loading…' : `${total} branch${total !== 1 ? 'es' : ''} · viewing all`}
          </p>
        </div>
        <button
          style={primaryBtnStyle}
          onClick={() => setShowCreateModal(true)}
        >
          + Add Branch
        </button>
      </div>

      {/* Error */}
      {isError && (
        <div style={{
          padding: '12px 16px', background: '#fef2f2',
          border: '1px solid #fecaca', borderRadius: 8,
          color: '#dc2626', fontSize: 14, marginBottom: 24,
        }}>
          Failed to load branches. Please refresh.
        </div>
      )}

      {/* ── Top section: KPIs + Leaderboard ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 320px',
        gap: 20,
        marginBottom: 32,
        alignItems: 'stretch',
      }}>
        <KpiCards overall={overall} isLoading={isLoading} />
        <Leaderboard branches={branches} isLoading={isLoading} />
      </div>

      {/* ── Branch cards grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 20,
      }}>
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <BranchCardSkeleton key={i} />)
          : branches.length === 0
            ? (
              <div style={{
                gridColumn: '1 / -1', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '80px 24px', color: 'var(--text3)',
                border: '2px dashed var(--border)', borderRadius: 12,
              }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🏢</div>
                <p style={{ fontSize: 14, color: 'var(--text2)' }}>
                  No branches yet. Click <strong>Add Branch</strong> to create your first.
                </p>
              </div>
            )
            : branches.map(branch => (
              <BranchCard
                key={branch.id}
                branch={branch}
                isCurrentBranch={branch.id === activeBranchId}
                onEdit={() => setEditBranch(branch)}
                onSwitch={() => setConfirmState({ type: 'switch', branch })}
                onDeactivate={() => setConfirmState({ type: 'deactivate', branch })}
                onDelete={() => setConfirmState({ type: 'delete', branch })}
              />
            ))
        }
      </div>

      {/* ── Create modal (reuses EditBranchModal with no branch prop) ── */}
      {showCreateModal && (
        <CreateBranchModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateSave}
          isSaving={createBranch.isPending}
        />
      )}

      {/* ── Edit modal ── */}
      {editBranch && (
        <EditBranchModal
          branch={editBranch}
          onClose={() => setEditBranch(null)}
          onSave={handleSaveEdit}
          isSaving={updateBranch.isPending}
        />
      )}

      {/* ── Confirm dialog ── */}
      {confirmState && (
        <ConfirmDialog
          type={confirmState.type}
          branch={confirmState.branch}
          onConfirm={handleConfirm}
          onClose={() => setConfirmState(null)}
          isPending={isPending}
        />
      )}
    </div>
  )
}

// ── Create Branch Modal ────────────────────────────────────────────────────────

function CreateBranchModal({
  onClose,
  onSave,
  isSaving,
}: {
  onClose: () => void
  onSave: (payload: BranchPayload) => void
  isSaving: boolean
}) {
  const [name,     setName]     = useState('')
  const [city,     setCity]     = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [error,    setError]    = useState('')

  const handleSave = () => {
    if (!name.trim()) { setError('Branch name is required.'); return }
    onSave({ name: name.trim(), city: city.trim() || undefined, whatsapp_number: whatsapp.trim() || undefined })
  }

  return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, maxWidth: 480 }}>
        <div style={modalHeaderStyle}>
          <span style={modalTitleStyle}>Add New Branch</span>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Branch Name *</label>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            style={{ ...inputStyle, borderColor: error ? '#ef4444' : undefined }}
            placeholder="e.g. Bandra West"
            autoFocus
          />
          {error && <span style={{ fontSize: 12, color: '#ef4444', marginTop: 4, display: 'block' }}>{error}</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>City</label>
            <input value={city} onChange={e => setCity(e.target.value)} style={inputStyle} placeholder="e.g. Mumbai" />
          </div>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>WhatsApp Number</label>
            <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} style={inputStyle} placeholder="+91 98765 43210" />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button style={ghostBtnStyle} onClick={onClose} disabled={isSaving}>Cancel</button>
          <button style={primaryBtnStyle} onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Creating…' : 'Create Branch'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.45)',
  backdropFilter: 'blur(2px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: 16,
}

const modalStyle: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: 28,
  width: '100%',
  boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
}

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20,
}

const modalTitleStyle: React.CSSProperties = {
  fontWeight: 700, fontSize: 17, color: 'var(--text)',
}

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', fontSize: 18,
  color: 'var(--text2)', cursor: 'pointer', lineHeight: 1, padding: 4,
}

const fieldGroupStyle: React.CSSProperties = { marginBottom: 16 }

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--text3)',
  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12,
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text2)', marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: 14,
  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  background: 'var(--bg)', color: 'var(--text)',
  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
}

const primaryBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 18px', fontSize: 14, fontWeight: 600,
  background: 'var(--accent)', color: '#fff',
  border: 'none', borderRadius: 'var(--radius)',
  cursor: 'pointer', transition: 'opacity 0.15s',
}

const ghostBtnStyle: React.CSSProperties = {
  padding: '9px 16px', fontSize: 14, fontWeight: 500,
  background: 'transparent', color: 'var(--text2)',
  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  cursor: 'pointer',
}
