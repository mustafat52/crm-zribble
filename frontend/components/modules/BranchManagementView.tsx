'use client'

import { useState } from 'react'
import {
  useBranches,
  useCreateBranch,
  useUpdateBranch,
  useToggleBranch,
  useDeleteBranch,
  Branch,
  BranchPayload,
} from '@/hooks/useBranches'
import { useAuthStore } from '@/store/useAuthStore'

// ── Inline SVG icons ───────────────────────────────────────────────────────────

const IconPlus = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </svg>
)
const IconEdit = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)
const IconTrash = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="3 6 5 6 21 6" strokeLinecap="round" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" />
    <path d="M10 11v6M14 11v6" strokeLinecap="round" />
  </svg>
)
const IconBuilding = () => (
  <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const IconPhone = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1 19.79 19.79 0 0 1 1.62 4.48 2 2 0 0 1 3.6 2.28h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.92 17z" />
  </svg>
)
const IconMapPin = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)
const IconUser = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)
const IconLock = () => (
  <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" />
  </svg>
)

// ── Types ──────────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string
  name: string
  email: string
}

// ── Branch Modal ───────────────────────────────────────────────────────────────

interface ModalProps {
  branch?: Branch | null
  team: TeamMember[]
  onClose: () => void
  onSave: (payload: BranchPayload) => void
  isSaving: boolean
}

function BranchModal({ branch, team, onClose, onSave, isSaving }: ModalProps) {
  const [name, setName] = useState(branch?.name ?? '')
  const [city, setCity] = useState(branch?.city ?? '')
  const [whatsapp, setWhatsapp] = useState(branch?.whatsapp_number ?? '')
  const [managerId, setManagerId] = useState<string>(branch?.manager_id ?? '')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (!name.trim()) { setError('Branch name is required.'); return }
    onSave({
      name: name.trim(),
      city: city.trim() || undefined,
      whatsapp_number: whatsapp.trim() || undefined,
      manager_id: managerId || null,
    })
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>{branch ? 'Edit Branch' : 'Add Branch'}</span>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close">✕</button>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Branch Name *</label>
          <input
            style={{ ...styles.input, ...(error ? styles.inputError : {}) }}
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            placeholder="e.g. Mumbai North"
            autoFocus
          />
          {error && <span style={styles.errorText}>{error}</span>}
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>City</label>
          <input
            style={styles.input}
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="e.g. Mumbai"
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>WhatsApp Number</label>
          <input
            style={styles.input}
            value={whatsapp}
            onChange={e => setWhatsapp(e.target.value)}
            placeholder="e.g. +91 98765 43210"
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Branch Manager</label>
          <select
            style={styles.select}
            value={managerId}
            onChange={e => setManagerId(e.target.value)}
          >
            <option value="">— No manager assigned —</option>
            {team.map(m => (
              <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
            ))}
          </select>
        </div>

        <div style={styles.modalFooter}>
          <button style={styles.btnGhost} onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button style={styles.btnPrimary} onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving…' : branch ? 'Save Changes' : 'Create Branch'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete Confirm ─────────────────────────────────────────────────────────────

function DeleteConfirm({ branch, onClose, onConfirm, isDeleting }: {
  branch: Branch
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
}) {
  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, maxWidth: 400 }}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>Delete Branch</span>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <p style={{ color: 'var(--text2)', fontSize: 14, margin: '16px 0 24px' }}>
          Are you sure you want to delete{' '}
          <strong style={{ color: 'var(--text)' }}>{branch.name}</strong>?
          This action cannot be undone.
        </p>
        <div style={styles.modalFooter}>
          <button style={styles.btnGhost} onClick={onClose} disabled={isDeleting}>Cancel</button>
          <button
            style={{ ...styles.btnPrimary, background: '#ef4444' }}
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting…' : 'Delete Branch'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Branch Card ────────────────────────────────────────────────────────────────

function BranchCard({
  branch,
  isOwner,
  onEdit,
  onToggle,
  onDelete,
  isToggling,
}: {
  branch: Branch
  isOwner: boolean
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
  isToggling: boolean
}) {
  const initials = branch.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{
      ...styles.card,
      opacity: branch.is_active ? 1 : 0.6,
      borderTop: `3px solid ${branch.is_active ? 'var(--accent)' : '#d1d5db'}`,
    }}>
      <div style={styles.cardHeader}>
        <div style={styles.cardAvatar}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.cardName}>{branch.name}</div>
          <span style={{
            ...styles.badge,
            background: branch.is_active ? '#dcfce7' : '#f3f4f6',
            color: branch.is_active ? '#16a34a' : '#6b7280',
          }}>
            {branch.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div style={styles.cardMeta}>
        {branch.city && (
          <div style={styles.metaRow}>
            <IconMapPin />
            <span>{branch.city}</span>
          </div>
        )}
        {branch.whatsapp_number && (
          <div style={styles.metaRow}>
            <IconPhone />
            <span>{branch.whatsapp_number}</span>
          </div>
        )}
        <div style={styles.metaRow}>
          <IconUser />
          <span>
            {branch.manager?.name
              ? branch.manager.name
              : <em style={{ color: 'var(--text3)' }}>No manager</em>
            }
          </span>
        </div>
      </div>

      {isOwner && (
        <div style={styles.cardActions}>
          <button style={styles.btnIconGhost} onClick={onEdit} title="Edit branch">
            <IconEdit /> Edit
          </button>
          <button
            style={{ ...styles.btnIconGhost, color: branch.is_active ? '#f59e0b' : '#16a34a' }}
            onClick={onToggle}
            disabled={isToggling}
            title={branch.is_active ? 'Deactivate' : 'Activate'}
          >
            {isToggling ? '…' : branch.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button style={{ ...styles.btnIconGhost, color: '#ef4444' }} onClick={onDelete} title="Delete branch">
            <IconTrash /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ── Loading skeleton ───────────────────────────────────────────────────────────

function BranchSkeleton() {
  return (
    <div style={{ ...styles.card, borderTop: '3px solid #e5e7eb' }}>
      {[60, 40, 50, 70].map((w, i) => (
        <div key={i} style={{
          height: i === 0 ? 20 : 14,
          width: `${w}%`,
          background: '#f3f4f6',
          borderRadius: 4,
          marginBottom: 10,
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ))}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
// ALL hooks are called unconditionally at the top — React rules of hooks.
// Early returns happen AFTER all hook calls.

export default function BranchManagementView() {
  // ── All hooks first — no early returns before this block ──────────────────
  const user        = useAuthStore(s => s.user)
  const isHydrated  = useAuthStore(s => s._hasHydrated)
  const isOwner     = (user?.roles?? []).includes('owner')

  const { branches, total, isLoading, isError } = useBranches()
  const createBranch = useCreateBranch()
  const updateBranch = useUpdateBranch()
  const toggleBranch = useToggleBranch()
  const deleteBranch = useDeleteBranch()

  const [showModal,      setShowModal]      = useState(false)
  const [editBranch,     setEditBranch]     = useState<Branch | null>(null)
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null)
  const [togglingId,     setTogglingId]     = useState<string | null>(null)
  const [team,           setTeam]           = useState<TeamMember[]>([])
  const [teamLoaded,     setTeamLoaded]     = useState(false)

  // ── Handlers ──────────────────────────────────────────────────────────────

  const loadTeam = async () => {
    if (teamLoaded) return
    try {
      const { api } = await import('@/lib/api')
      const res = await api.get<{ data: TeamMember[] }>('/team')
      setTeam(res.data ?? [])
      setTeamLoaded(true)
    } catch { /* non-critical — modal works without manager dropdown */ }
  }

  const openCreate = () => {
    loadTeam()
    setEditBranch(null)
    setShowModal(true)
  }

  const openEdit = (branch: Branch) => {
    loadTeam()
    setEditBranch(branch)
    setShowModal(true)
  }

  const handleSave = async (payload: BranchPayload) => {
    if (editBranch) {
      await updateBranch.mutateAsync({ id: editBranch.id, payload })
    } else {
      await createBranch.mutateAsync(payload)
    }
    setShowModal(false)
    setEditBranch(null)
  }

  const handleToggle = async (branch: Branch) => {
    setTogglingId(branch.id)
    try { await toggleBranch.mutateAsync(branch.id) }
    finally { setTogglingId(null) }
  }

  const handleDelete = async () => {
    if (!deletingBranch) return
    await deleteBranch.mutateAsync(deletingBranch.id)
    setDeletingBranch(null)
  }

  // ── Early returns AFTER all hooks ─────────────────────────────────────────

  // Wait for Zustand to rehydrate from localStorage before rendering
  if (!isHydrated) return null

  // Non-owner permission block (only shown after hydration to avoid flash)
  if (!isOwner) {
    return (
      <div style={styles.permBlock}>
        <IconLock />
        <h3 style={{ margin: '16px 0 8px', fontSize: 18, fontWeight: 600 }}>
          Owner Access Only
        </h3>
        <p style={{ color: 'var(--text2)', fontSize: 14, maxWidth: 320, textAlign: 'center' }}>
          Branch management is restricted to account owners. Contact your owner to make changes.
        </p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={styles.page}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>

      {/* Page header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Branches</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 2 }}>
            {isLoading ? 'Loading…' : `${total} branch${total !== 1 ? 'es' : ''}`}
          </p>
        </div>
        <button style={styles.btnPrimary} onClick={openCreate}>
          <IconPlus /> Add Branch
        </button>
      </div>

      {/* Error banner */}
      {isError && (
        <div style={styles.errorBanner}>
          Failed to load branches. Please refresh.
        </div>
      )}

      {/* Branch grid */}
      <div style={styles.grid}>
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <BranchSkeleton key={i} />)
          : branches.length === 0
          ? (
            <div style={styles.emptyState}>
              <IconBuilding />
              <p style={{ marginTop: 12, color: 'var(--text2)', fontSize: 14 }}>
                No branches yet. Click <strong>Add Branch</strong> to create your first one.
              </p>
            </div>
          )
          : branches.map(branch => (
            <BranchCard
              key={branch.id}
              branch={branch}
              isOwner={isOwner}
              onEdit={() => openEdit(branch)}
              onToggle={() => handleToggle(branch)}
              onDelete={() => setDeletingBranch(branch)}
              isToggling={togglingId === branch.id}
            />
          ))
        }
      </div>

      {/* Modals */}
      {showModal && (
        <BranchModal
          branch={editBranch}
          team={team}
          onClose={() => { setShowModal(false); setEditBranch(null) }}
          onSave={handleSave}
          isSaving={createBranch.isPending || updateBranch.isPending}
        />
      )}
      {deletingBranch && (
        <DeleteConfirm
          branch={deletingBranch}
          onClose={() => setDeletingBranch(null)}
          onConfirm={handleDelete}
          isDeleting={deleteBranch.isPending}
        />
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '32px 32px 64px',
    maxWidth: 1100,
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 20,
  },
  card: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: 20,
    boxShadow: 'var(--shadow-sm)',
    transition: 'var(--transition)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: 'var(--accent)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 15,
    flexShrink: 0,
  },
  cardName: {
    fontWeight: 600,
    fontSize: 15,
    color: 'var(--text)',
    marginBottom: 4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  badge: {
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 20,
    letterSpacing: '0.03em',
  },
  cardMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16,
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: 'var(--text2)',
  },
  cardActions: {
    display: 'flex',
    gap: 6,
    borderTop: '1px solid var(--border)',
    paddingTop: 14,
    flexWrap: 'wrap',
  },
  btnIconGhost: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 10px',
    fontSize: 12,
    fontWeight: 500,
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    background: 'transparent',
    color: 'var(--text2)',
    cursor: 'pointer',
    transition: 'var(--transition)',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(2px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: 28,
    width: '100%',
    maxWidth: 480,
    boxShadow: 'var(--shadow-lg)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontWeight: 700,
    fontSize: 17,
    color: 'var(--text)',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: 18,
    color: 'var(--text2)',
    cursor: 'pointer',
    lineHeight: 1,
    padding: 4,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text2)',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    fontSize: 14,
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    background: 'var(--bg)',
    color: 'var(--text)',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  select: {
    width: '100%',
    padding: '9px 12px',
    fontSize: 14,
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    background: 'var(--bg)',
    color: 'var(--text)',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    display: 'block',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 24,
  },
  btnPrimary: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 18px',
    fontSize: 14,
    fontWeight: 600,
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  btnGhost: {
    padding: '9px 16px',
    fontSize: 14,
    fontWeight: 500,
    background: 'transparent',
    color: 'var(--text2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
  },
  errorBanner: {
    padding: '12px 16px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 'var(--radius)',
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 24,
  },
  emptyState: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 24px',
    color: 'var(--text3)',
    border: '2px dashed var(--border)',
    borderRadius: 'var(--radius-lg)',
  },
  permBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '100px 24px',
    color: 'var(--text2)',
  },
}