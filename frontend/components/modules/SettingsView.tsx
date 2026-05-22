'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import {
  useBusiness, useUpdateBusiness,
  useLeadStatusesSettings, useCreateLeadStatus, useUpdateLeadStatus, useDeleteLeadStatus,
  useTeamSettings, useInviteTeamMember, useUpdateTeamMember, useDeactivateTeamMember,
  useApiKeys, useCreateApiKey, useRevokeApiKey,
  type LeadStatus, type TeamMember, type ApiKey,
} from '@/hooks/useSettings'
import { useBranches } from '@/hooks/useBranches'

// ---------------------------------------------------------------------------
// Common timezone list
// ---------------------------------------------------------------------------
const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Australia/Sydney', 'Pacific/Auckland', 'UTC',
]

// ---------------------------------------------------------------------------
// SettingsView — root component
// ---------------------------------------------------------------------------
export default function SettingsView() {
  const isHydrated     = useAuthStore(s => s._hasHydrated)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const user           = useAuthStore(s => s.user)

  const [activeTab, setActiveTab] = useState<'business' | 'statuses' | 'team' | 'apikeys'>('business')

  // All hooks called unconditionally — React rules of hooks
  const businessQ  = useBusiness()
  const statusesQ  = useLeadStatusesSettings()
  const teamQ      = useTeamSettings()
  const apiKeysQ   = useApiKeys()

  if (!isHydrated) return null
  if (!isAuthenticated) return null

  const isOwner = user?.roles?.includes('owner') ?? false

  const tabs = [
    { id: 'business', label: 'Business' },
    { id: 'statuses', label: 'Lead Statuses' },
    { id: 'team',     label: 'Team' },
    { id: 'apikeys',  label: 'API Keys' },
  ] as const

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 0' }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Settings</h1>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
          Manage your business, pipeline stages, team, and integrations.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: activeTab === t.id ? 600 : 400,
              color: activeTab === t.id ? 'var(--accent)' : 'var(--text2)',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: -1,
              transition: 'var(--transition)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'business' && (
        <BusinessTab
          data={businessQ.data}
          isLoading={businessQ.isLoading}
          isOwner={isOwner}
        />
      )}
      {activeTab === 'statuses' && (
        <StatusesTab
          statuses={statusesQ.data ?? []}
          isLoading={statusesQ.isLoading}
          isOwner={isOwner}
        />
      )}
      {activeTab === 'team' && (
        <TeamTab
          members={teamQ.data?.data ?? []}
          isLoading={teamQ.isLoading}
          isOwner={isOwner}
          currentUserId={user?.id ?? ''}
        />
      )}
      {activeTab === 'apikeys' && (
        <ApiKeysTab
          keys={apiKeysQ.data ?? []}
          isLoading={apiKeysQ.isLoading}
          isOwner={isOwner}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 1 — Business Settings
// ---------------------------------------------------------------------------
function BusinessTab({
  data, isLoading, isOwner,
}: { data: ReturnType<typeof useBusiness>['data']; isLoading: boolean; isOwner: boolean }) {
  const update = useUpdateBusiness()

  const [name,             setName]             = useState('')
  const [timezone,         setTimezone]         = useState('')
  const [whatsapp,         setWhatsapp]         = useState('')
  const [dupHandling,      setDupHandling]      = useState<'merge' | 'new'>('merge')
  const [saved,            setSaved]            = useState(false)
  const [error,            setError]            = useState<string | null>(null)

  useEffect(() => {
    if (data) {
      setName(data.name ?? '')
      setTimezone(data.timezone ?? 'Asia/Kolkata')
      setWhatsapp(data.whatsapp_number ?? '')
      setDupHandling(data.duplicate_handling ?? 'merge')
    }
  }, [data])

  if (isLoading) return <SkeletonBlock lines={6} />

  const handleSave = async () => {
    setError(null)
    try {
      await update.mutateAsync({ name, timezone, whatsapp_number: whatsapp || null, duplicate_handling: dupHandling })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save.')
    }
  }

  return (
    <Panel title="Business Information">
      {!isOwner && <OwnerOnlyBanner />}

      <FieldRow label="Business Name">
        <input
          value={name}
          onChange={e => setName(e.currentTarget.value)}
          disabled={!isOwner}
          style={inputStyle(!isOwner)}
          placeholder="e.g. Glamour Salon & Spa"
        />
      </FieldRow>

      <FieldRow label="Timezone">
        <select
          value={timezone}
          onChange={e => setTimezone(e.currentTarget.value)}
          disabled={!isOwner}
          style={inputStyle(!isOwner)}
        >
          {TIMEZONES.map(tz => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </FieldRow>

      <FieldRow label="WhatsApp Number">
        <input
          value={whatsapp}
          onChange={e => setWhatsapp(e.currentTarget.value)}
          disabled={!isOwner}
          style={inputStyle(!isOwner)}
          placeholder="+91 98765 43210"
        />
      </FieldRow>

      <FieldRow label="Plan">
        <span style={{
          display: 'inline-block', padding: '3px 10px', borderRadius: 99,
          background: 'var(--accent-bg)', color: 'var(--accent)',
          fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
        }}>
          {data?.plan ?? '—'}
        </span>
      </FieldRow>

      <FieldRow label="Duplicate Handling" hint="What happens when the same mobile number submits twice?">
        <div style={{ display: 'flex', gap: 10 }}>
          {(['merge', 'new'] as const).map(opt => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: isOwner ? 'pointer' : 'default', fontSize: 13, color: 'var(--text2)' }}>
              <input
                type="radio"
                value={opt}
                checked={dupHandling === opt}
                onChange={() => isOwner && setDupHandling(opt)}
                disabled={!isOwner}
              />
              {opt === 'merge' ? 'Merge into existing lead' : 'Always create new lead'}
            </label>
          ))}
        </div>
      </FieldRow>

      {error && <ErrorBanner message={error} />}

      {isOwner && (
        <div style={{ marginTop: 24 }}>
          <SaveButton loading={update.isPending} saved={saved} onClick={handleSave} />
        </div>
      )}
    </Panel>
  )
}

// ---------------------------------------------------------------------------
// Tab 2 — Lead Statuses
// ---------------------------------------------------------------------------
function StatusesTab({
  statuses, isLoading, isOwner,
}: { statuses: LeadStatus[]; isLoading: boolean; isOwner: boolean }) {
  const createStatus = useCreateLeadStatus()
  const updateStatus = useUpdateLeadStatus()
  const deleteStatus = useDeleteLeadStatus()

  const [showAdd,   setShowAdd]   = useState(false)
  const [newName,   setNewName]   = useState('')
  const [newColor,  setNewColor]  = useState('#7c3aed')
  const [addError,  setAddError]  = useState<string | null>(null)
  const [deleteErr, setDeleteErr] = useState<string | null>(null)

  if (isLoading) return <SkeletonBlock lines={5} />

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAddError(null)
    try {
      await createStatus.mutateAsync({ name: newName.trim(), color: newColor })
      setNewName('')
      setNewColor('#7c3aed')
      setShowAdd(false)
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : 'Failed to create status.')
    }
  }

  const handleMoveUp = (status: LeadStatus, index: number) => {
    if (index === 0) return
    const prev = statuses[index - 1]
    updateStatus.mutate({ id: status.id, payload: { sort_order: prev.sort_order } })
    updateStatus.mutate({ id: prev.id,    payload: { sort_order: status.sort_order } })
  }

  const handleMoveDown = (status: LeadStatus, index: number) => {
    if (index === statuses.length - 1) return
    const next = statuses[index + 1]
    updateStatus.mutate({ id: status.id, payload: { sort_order: next.sort_order } })
    updateStatus.mutate({ id: next.id,   payload: { sort_order: status.sort_order } })
  }

  const handleDelete = async (id: string) => {
    setDeleteErr(null)
    try {
      await deleteStatus.mutateAsync(id)
    } catch (e: unknown) {
      setDeleteErr(e instanceof Error ? e.message : 'Cannot delete this status.')
    }
  }

  return (
    <Panel title="Pipeline Stages">
      {!isOwner && <OwnerOnlyBanner />}
      {deleteErr && <ErrorBanner message={deleteErr} onDismiss={() => setDeleteErr(null)} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {statuses.length === 0 && (
          <p style={{ color: 'var(--text3)', fontSize: 13, padding: '12px 0' }}>No statuses yet. Add your first one below.</p>
        )}

        {statuses.map((s, i) => (
          <StatusRow
            key={s.id}
            status={s}
            index={i}
            total={statuses.length}
            isOwner={isOwner}
            onMoveUp={() => handleMoveUp(s, i)}
            onMoveDown={() => handleMoveDown(s, i)}
            onDelete={() => handleDelete(s.id)}
            onUpdate={(payload) => updateStatus.mutate({ id: s.id, payload })}
          />
        ))}
      </div>

      {isOwner && (
        <div style={{ marginTop: 16 }}>
          {!showAdd ? (
            <button onClick={() => setShowAdd(true)} style={ghostBtnStyle}>
              + Add Status
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 12, background: 'var(--bg2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <input
                type="color"
                value={newColor}
                onChange={e => setNewColor(e.currentTarget.value)}
                style={{ width: 32, height: 32, border: 'none', padding: 0, cursor: 'pointer', borderRadius: 4 }}
              />
              <input
                value={newName}
                onChange={e => setNewName(e.currentTarget.value)}
                placeholder="Status name"
                style={{ ...inputStyle(false), flex: 1 }}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <button onClick={handleAdd} disabled={createStatus.isPending || !newName.trim()} style={primaryBtnStyle}>
                {createStatus.isPending ? 'Adding…' : 'Add'}
              </button>
              <button onClick={() => { setShowAdd(false); setNewName(''); setAddError(null) }} style={ghostBtnStyle}>
                Cancel
              </button>
            </div>
          )}
          {addError && <ErrorBanner message={addError} />}
        </div>
      )}
    </Panel>
  )
}

function StatusRow({
  status, index, total, isOwner, onMoveUp, onMoveDown, onDelete, onUpdate,
}: {
  status: LeadStatus; index: number; total: number; isOwner: boolean
  onMoveUp: () => void; onMoveDown: () => void; onDelete: () => void
  onUpdate: (p: Partial<LeadStatus>) => void
}) {
  const [editing, setEditing]   = useState(false)
  const [name,    setName]      = useState(status.name)
  const [color,   setColor]     = useState(status.color)

  const saveEdit = () => {
    onUpdate({ name, color })
    setEditing(false)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px', borderRadius: 'var(--radius)',
      border: '1px solid var(--border)', background: 'var(--bg)',
    }}>
      {/* Color swatch */}
      {editing ? (
        <input type="color" value={color} onChange={e => setColor(e.currentTarget.value)}
          style={{ width: 28, height: 28, border: 'none', padding: 0, cursor: 'pointer', borderRadius: 4 }} />
      ) : (
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: status.color, flexShrink: 0 }} />
      )}

      {/* Name */}
      {editing ? (
        <input value={name} onChange={e => setName(e.currentTarget.value)}
          style={{ ...inputStyle(false), flex: 1, padding: '4px 8px' }}
          onKeyDown={e => e.key === 'Enter' && saveEdit()} autoFocus />
      ) : (
        <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{status.name}</span>
      )}

      {/* Flags */}
      <div style={{ display: 'flex', gap: 6 }}>
        {status.is_converted && <FlagBadge label="Converted" color="#16a34a" />}
        {status.is_lost      && <FlagBadge label="Lost"      color="#dc2626" />}
      </div>

      {/* Actions */}
      {isOwner && (
        <div style={{ display: 'flex', gap: 4 }}>
          {editing ? (
            <>
              <ActionBtn label="Save"   onClick={saveEdit}           color="var(--accent)" />
              <ActionBtn label="Cancel" onClick={() => setEditing(false)} />
            </>
          ) : (
            <>
              <ActionBtn label="↑"    onClick={onMoveUp}   disabled={index === 0} />
              <ActionBtn label="↓"    onClick={onMoveDown} disabled={index === total - 1} />
              <ActionBtn label="Edit" onClick={() => setEditing(true)} />
              <ActionBtn label="Delete" onClick={onDelete} color="#dc2626" />
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 3 — Team
// ---------------------------------------------------------------------------
function TeamTab({
  members, isLoading, isOwner, currentUserId,
}: { members: TeamMember[]; isLoading: boolean; isOwner: boolean; currentUserId: string }) {
  const invite     = useInviteTeamMember()
  const updateMem  = useUpdateTeamMember()
  const deactivate = useDeactivateTeamMember()
  const branchesQ  = useBranches()

  const [showInvite,   setShowInvite]   = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [inviteError,  setInviteError]  = useState<string | null>(null)

  const [invName,   setInvName]   = useState('')
  const [invEmail,  setInvEmail]  = useState('')
  const [invRole,   setInvRole]   = useState<'manager' | 'executive' | 'read-only'>('executive')
  const [invBranch, setInvBranch] = useState('')

  const branches = branchesQ.branches ?? []

  if (isLoading) return <SkeletonBlock lines={4} />

  const handleInvite = async () => {
    if (!invName || !invEmail || !invBranch) { setInviteError('All fields are required.'); return }
    setInviteError(null)
    try {
      const res = await invite.mutateAsync({ name: invName, email: invEmail, role: invRole, branch_id: invBranch })
      setTempPassword(res.temp_password)
      setInvName(''); setInvEmail(''); setInvRole('executive'); setInvBranch('')
      setShowInvite(false)
    } catch (e: unknown) {
      setInviteError(e instanceof Error ? e.message : 'Failed to invite member.')
    }
  }

  return (
    <Panel title="Team Members">
      {!isOwner && <OwnerOnlyBanner />}

      {/* Temp password reveal */}
      {tempPassword && (
        <div style={{
          padding: 14, borderRadius: 'var(--radius)', background: '#f0fdf4',
          border: '1px solid #bbf7d0', marginBottom: 16,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#15803d', margin: '0 0 6px' }}>
            ✅ User created — share this password with them now. It will not be shown again.
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code style={{ flex: 1, padding: '6px 10px', background: '#dcfce7', borderRadius: 6, fontSize: 14, fontFamily: 'monospace' }}>
              {tempPassword}
            </code>
            <button onClick={() => { navigator.clipboard.writeText(tempPassword); }}
              style={primaryBtnStyle}>Copy</button>
            <button onClick={() => setTempPassword(null)} style={ghostBtnStyle}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div style={{ padding: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg2)', marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>Invite Team Member</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input value={invName} onChange={e => setInvName(e.currentTarget.value)} style={inputStyle(false)} placeholder="Full name" />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input value={invEmail} onChange={e => setInvEmail(e.currentTarget.value)} style={inputStyle(false)} placeholder="email@example.com" type="email" />
            </div>
            <div>
              <label style={labelStyle}>Role</label>
              <select value={invRole} onChange={e => setInvRole(e.currentTarget.value as typeof invRole)} style={inputStyle(false)}>
                <option value="manager">Manager</option>
                <option value="executive">Executive</option>
                <option value="read-only">Read Only</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Branch</label>
              <select value={invBranch} onChange={e => setInvBranch(e.currentTarget.value)} style={inputStyle(false)}>
                <option value="">Select branch…</option>
                {branches.filter((b: { is_active: boolean }) => b.is_active).map((b: { id: string; name: string }) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          {inviteError && <ErrorBanner message={inviteError} />}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleInvite} disabled={invite.isPending} style={primaryBtnStyle}>
              {invite.isPending ? 'Inviting…' : 'Create User'}
            </button>
            <button onClick={() => { setShowInvite(false); setInviteError(null) }} style={ghostBtnStyle}>Cancel</button>
          </div>
        </div>
      )}

      {/* Members table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Member', 'Role', 'Branch', 'Status', isOwner ? 'Actions' : ''].filter(Boolean).map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--text3)', fontWeight: 600, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <TeamRow
                key={m.id}
                member={m}
                isOwner={isOwner}
                isSelf={m.id === currentUserId}
                branches={branches}
                onUpdate={(payload) => updateMem.mutate({ id: m.id, payload })}
                onDeactivate={() => deactivate.mutate(m.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {isOwner && !showInvite && (
        <div style={{ marginTop: 14 }}>
          <button onClick={() => setShowInvite(true)} style={primaryBtnStyle}>+ Invite Member</button>
        </div>
      )}
    </Panel>
  )
}

function TeamRow({
  member, isOwner, isSelf, branches, onUpdate, onDeactivate,
}: {
  member: TeamMember; isOwner: boolean; isSelf: boolean
  branches: { id: string; name: string; is_active: boolean }[]
  onUpdate: (p: { role?: string; branch_id?: string; is_active?: boolean }) => void
  onDeactivate: () => void
}) {
  const [editing, setEditing]   = useState(false)
  const [role,    setRole]      = useState(member.roles[0] ?? 'executive')
  const [branch,  setBranch]    = useState(member.branch_id ?? '')

  const saveEdit = () => {
    onUpdate({ role: role as 'manager' | 'executive' | 'read-only', branch_id: branch || undefined })
    setEditing(false)
  }

  return (
    <tr style={{ borderBottom: '1px solid var(--border2 )', background: 'transparent' }}>
      {/* Member */}
      <td style={{ padding: '10px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-bg)',
            color: 'var(--accent)', fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {member.initials}
          </div>
          <div>
            <div style={{ fontWeight: 500, color: 'var(--text)' }}>{member.name} {isSelf && <span style={{ color: 'var(--text3)', fontSize: 11 }}>(you)</span>}</div>
            <div style={{ color: 'var(--text3)', fontSize: 11 }}>{member.email}</div>
          </div>
        </div>
      </td>

      {/* Role */}
      <td style={{ padding: '10px 10px' }}>
        {editing ? (
          <select value={role} onChange={e => setRole(e.currentTarget.value)} style={{ ...inputStyle(false), padding: '3px 6px', fontSize: 12 }}>
            <option value="manager">Manager</option>
            <option value="executive">Executive</option>
            <option value="read-only">Read Only</option>
          </select>
        ) : (
          <RoleBadge role={member.roles[0] ?? '—'} />
        )}
      </td>

      {/* Branch */}
      <td style={{ padding: '10px 10px', color: 'var(--text2)', fontSize: 12 }}>
        {editing ? (
          <select value={branch} onChange={e => setBranch(e.currentTarget.value)} style={{ ...inputStyle(false), padding: '3px 6px', fontSize: 12 }}>
            <option value="">No branch</option>
            {branches.map((b: { id: string; name: string }) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        ) : (
          member.branch?.name ?? <span style={{ color: 'var(--text3)' }}>—</span>
        )}
      </td>

      {/* Status */}
      <td style={{ padding: '10px 10px' }}>
        <span style={{
          display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
          background: member.is_active ? '#dcfce7' : '#fee2e2',
          color: member.is_active ? '#15803d' : '#dc2626',
        }}>
          {member.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>

      {/* Actions */}
      {isOwner && (
        <td style={{ padding: '10px 10px' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {editing ? (
              <>
                <ActionBtn label="Save"   onClick={saveEdit} color="var(--accent)" />
                <ActionBtn label="Cancel" onClick={() => setEditing(false)} />
              </>
            ) : (
              <>
                {!isSelf && (
                  <>
                    <ActionBtn label="Edit" onClick={() => setEditing(true)} />
                    {member.is_active
                      ? <ActionBtn label="Deactivate" onClick={onDeactivate} color="#dc2626" />
                      : <ActionBtn label="Activate"   onClick={() => onUpdate({ is_active: true })} color="#16a34a" />
                    }
                  </>
                )}
              </>
            )}
          </div>
        </td>
      )}
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Tab 4 — API Keys
// ---------------------------------------------------------------------------
function ApiKeysTab({
  keys, isLoading, isOwner,
}: { keys: ApiKey[]; isLoading: boolean; isOwner: boolean }) {
  const create = useCreateApiKey()
  const revoke = useRevokeApiKey()

  const [showCreate,   setShowCreate]   = useState(false)
  const [keyName,      setKeyName]      = useState('')
  const [revealedKey,  setRevealedKey]  = useState<string | null>(null)
  const [createError,  setCreateError]  = useState<string | null>(null)

  if (isLoading) return <SkeletonBlock lines={3} />

  const handleCreate = async () => {
    if (!keyName.trim()) return
    setCreateError(null)
    try {
      const res = await create.mutateAsync({ name: keyName.trim() })
      setRevealedKey(res.raw_key)
      setKeyName('')
      setShowCreate(false)
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create key.')
    }
  }

  return (
    <Panel title="API Keys">
      {!isOwner && <OwnerOnlyBanner />}

      {/* Revealed key banner */}
      {revealedKey && (
        <div style={{ padding: 14, borderRadius: 'var(--radius)', background: '#fefce8', border: '1px solid #fde047', marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#a16207', margin: '0 0 6px' }}>
            ⚠️ Copy this key now. It will never be shown again.
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code style={{ flex: 1, padding: '6px 10px', background: '#fef9c3', borderRadius: 6, fontSize: 13, fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {revealedKey}
            </code>
            <button onClick={() => navigator.clipboard.writeText(revealedKey!)} style={primaryBtnStyle}>Copy</button>
            <button onClick={() => setRevealedKey(null)} style={ghostBtnStyle}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Keys list */}
      {keys.length === 0 && !showCreate && (
        <p style={{ color: 'var(--text3)', fontSize: 13, padding: '12px 0' }}>
          No API keys yet. Generate one to start pushing leads from external sources.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {keys.map(k => (
          <div key={k.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 'var(--radius)',
            border: '1px solid var(--border)', background: k.is_active ? 'var(--bg)' : 'var(--bg2)',
            opacity: k.is_active ? 1 : 0.6,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text)' }}>{k.name}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                {k.key_prefix}••••••••••••••••••••••••
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'right' }}>
              {k.last_used_at
                ? <>Last used: {new Date(k.last_used_at).toLocaleDateString()}</>
                : 'Never used'}
            </div>
            <span style={{
              display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
              background: k.is_active ? '#dcfce7' : '#fee2e2',
              color: k.is_active ? '#15803d' : '#dc2626',
            }}>
              {k.is_active ? 'Active' : 'Revoked'}
            </span>
            {isOwner && k.is_active && (
              <ActionBtn label="Revoke" onClick={() => revoke.mutate(k.id)} color="#dc2626" />
            )}
          </div>
        ))}
      </div>

      {/* Generate key form */}
      {isOwner && (
        <div style={{ marginTop: 16 }}>
          {!showCreate ? (
            <button onClick={() => setShowCreate(true)} style={primaryBtnStyle}>+ Generate API Key</button>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <input
                  value={keyName}
                  onChange={e => setKeyName(e.currentTarget.value)}
                  placeholder="Key name (e.g. Website Form, Zapier)"
                  style={inputStyle(false)}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
                {createError && <ErrorBanner message={createError} />}
              </div>
              <button onClick={handleCreate} disabled={create.isPending || !keyName.trim()} style={primaryBtnStyle}>
                {create.isPending ? 'Generating…' : 'Generate'}
              </button>
              <button onClick={() => { setShowCreate(false); setCreateError(null) }} style={ghostBtnStyle}>Cancel</button>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: 24,
    }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>{title}</h2>
      {children}
    </div>
  )
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16, alignItems: 'start', marginBottom: 18 }}>
      <div>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>{label}</label>
        {hint && <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  )
}

function OwnerOnlyBanner() {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 'var(--radius)', background: '#fefce8',
      border: '1px solid #fde047', marginBottom: 16, fontSize: 13, color: '#a16207',
    }}>
      These settings can only be changed by the business owner.
    </div>
  )
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 12px', borderRadius: 'var(--radius)', background: '#fef2f2',
      border: '1px solid #fecaca', fontSize: 13, color: '#dc2626', marginTop: 8,
    }}>
      <span>{message}</span>
      {onDismiss && <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16 }}>×</button>}
    </div>
  )
}

function SkeletonBlock({ lines }: { lines: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 24 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{
          height: 36, borderRadius: 'var(--radius)', background: 'var(--bg2)',
          animation: 'pulse 1.4s ease-in-out infinite',
          opacity: 1 - i * 0.12,
        }} />
      ))}
    </div>
  )
}

function SaveButton({ loading, saved, onClick }: { loading: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      ...primaryBtnStyle,
      background: saved ? '#16a34a' : 'var(--accent)',
      minWidth: 100,
    }}>
      {loading ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
    </button>
  )
}

function FlagBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      padding: '1px 7px', borderRadius: 99, fontSize: 10, fontWeight: 600,
      background: color + '22', color,
    }}>
      {label}
    </span>
  )
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    'owner': '#7c3aed', 'manager': '#1d4ed8', 'executive': '#0369a1', 'read-only': '#6b7280',
  }
  const c = colors[role] ?? '#6b7280'
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
      background: c + '1a', color: c,
    }}>
      {role}
    </span>
  )
}

function ActionBtn({
  label, onClick, color = 'var(--text2)', disabled = false,
}: { label: string; onClick: () => void; color?: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '3px 9px', fontSize: 11, fontWeight: 500,
        border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
        background: 'var(--bg)', color: disabled ? 'var(--text3)' : color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'var(--transition)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Shared style helpers
// ---------------------------------------------------------------------------

const inputStyle = (disabled: boolean) => ({
  width: '100%',
  padding: '7px 10px',
  fontSize: 13,
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: disabled ? 'var(--bg2)' : 'var(--bg)',
  color: disabled ? 'var(--text3)' : 'var(--text)',
  outline: 'none',
  boxSizing: 'border-box' as const,
  cursor: disabled ? 'not-allowed' : 'text',
})

const primaryBtnStyle: React.CSSProperties = {
  padding: '7px 16px',
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 'var(--radius)',
  border: 'none',
  background: 'var(--accent)',
  color: '#fff',
  cursor: 'pointer',
  transition: 'var(--transition)',
  whiteSpace: 'nowrap',
}

const ghostBtnStyle: React.CSSProperties = {
  padding: '7px 14px',
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text2)',
  cursor: 'pointer',
  transition: 'var(--transition)',
  whiteSpace: 'nowrap',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text2)',
  marginBottom: 4,
}