'use client'

import { useAgencyStats, useAgencyBusinesses, useToggleBusiness, useAgencyStaff, useInviteStaff, useAssignBusiness, useUnassignBusiness, AgencyBusiness, AgencyStaff } from '@/hooks/useAgency'
import { useAuthStore } from '@/store/useAuthStore'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

// ─── Plan badge ───────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free: '#6b7280',
    starter: '#2563eb',
    pro: '#7c3aed',
    enterprise: '#059669',
  }
  return (
    <span style={{
      background: colors[plan] ?? '#6b7280',
      color: '#fff',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>
      {plan}
    </span>
  )
}

// ─── Invite Staff Modal ───────────────────────────────────────────

function InviteStaffModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [error, setError] = useState('')
  const invite = useInviteStaff()

  async function handleSubmit() {
    setError('')
    if (!name.trim() || !email.trim()) { setError('Name and email are required.'); return }
    try {
      const res = await invite.mutateAsync({ name, email }) as { temp_password: string }
      setTempPassword(res.temp_password)
    } catch {
      setError('Failed to invite staff. Email may already exist.')
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 32, width: 420, maxWidth: '90vw' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Invite Agency Staff</h3>

        {tempPassword ? (
          <>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 12 }}>Staff member created. Share this temporary password:</p>
            <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
              <p style={{ margin: 0, fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: '#92400e' }}>{tempPassword}</p>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: '#92400e' }}>⚠ This password will not be shown again.</p>
            </div>
            <button onClick={onClose} style={{ width: '100%', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 600, cursor: 'pointer' }}>
              Done
            </button>
          </>
        ) : (
          <>
            {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Full Name</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Jane Smith"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg2)', color: 'var(--text)', fontSize: 14, marginBottom: 14, boxSizing: 'border-box' }}
            />
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Email</label>
            <input
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="jane@agency.com"
              type="email"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg2)', color: 'var(--text)', fontSize: 14, marginBottom: 20, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, background: 'var(--bg2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 0', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={invite.isPending} style={{ flex: 1, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 600, cursor: 'pointer' }}>
                {invite.isPending ? 'Inviting...' : 'Invite'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Assign Business Modal ────────────────────────────────────────

function AssignModal({ staff, onClose }: { staff: AgencyStaff; onClose: () => void }) {
  const businessesQ = useAgencyBusinesses()
  const assign = useAssignBusiness()
  const unassign = useUnassignBusiness()

  const allBusinesses: AgencyBusiness[] = businessesQ.data?.data ?? []
  const assignedIds = staff.assigned_businesses.map(b => b.id)

  async function toggle(businessId: string) {
    if (assignedIds.includes(businessId)) {
      await unassign.mutateAsync({ staffId: staff.id, businessId })
    } else {
      await assign.mutateAsync({ staffId: staff.id, businessId })
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 32, width: 480, maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Assign Businesses</h3>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text2)' }}>for {staff.name}</p>

        {businessesQ.isLoading ? (
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>Loading businesses...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allBusinesses.map(b => {
              const isAssigned = assignedIds.includes(b.id)
              return (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: isAssigned ? '#f0fdf4' : 'var(--bg2)', border: `1px solid ${isAssigned ? '#86efac' : 'var(--border)'}`, borderRadius: 8 }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{b.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text2)' }}>{b.lead_count} leads · {b.plan}</p>
                  </div>
                  <button
                    onClick={() => toggle(b.id)}
                    style={{
                      padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12,
                      background: isAssigned ? '#ef4444' : 'var(--accent)',
                      color: '#fff',
                    }}
                  >
                    {isAssigned ? 'Remove' : 'Assign'}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <button onClick={onClose} style={{ marginTop: 20, width: '100%', background: 'var(--bg2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 0', fontWeight: 600, cursor: 'pointer' }}>
          Done
        </button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────

export default function AdminOverviewPage() {
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.roles?.includes('agency_admin') ?? false

  const statsQ = useAgencyStats()
  const businessesQ = useAgencyBusinesses()
  const staffQ = useAgencyStaff()
  const toggleBiz = useToggleBusiness()
  const router = useRouter()

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [assigningStaff, setAssigningStaff] = useState<AgencyStaff | null>(null)

  const stats = statsQ.data
  const businesses: AgencyBusiness[] = businessesQ.data?.data ?? []
  const staffList: AgencyStaff[] = staffQ.data?.data ?? []

  const statCards = [
    { label: 'Total Businesses', value: stats?.total_businesses ?? '—', color: '#7c3aed' },
    { label: 'Active Businesses', value: stats?.active_businesses ?? '—', color: '#059669' },
    { label: 'Total Leads', value: stats?.total_leads ?? '—', color: '#2563eb' },
    { label: 'Total Users', value: stats?.total_users ?? '—', color: '#d97706' },
  ]

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
          {isAdmin ? 'Agency Overview' : 'My Accounts'}
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text2)' }}>
          {isAdmin ? 'Platform-wide statistics and business management' : 'Businesses assigned to your account'}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {statCards.map(card => (
          <div key={card.label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Businesses table */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 32, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
            Businesses {businesses.length > 0 && <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({businesses.length})</span>}
          </h2>
        </div>

        {businessesQ.isLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>Loading...</div>
        ) : businesses.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>
            {isAdmin ? 'No businesses yet.' : 'No businesses assigned to your account.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  {['Name', 'Plan', 'Leads', 'Users', 'Branches', 'Status', ...(isAdmin ? ['Action'] : [])].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text2)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {businesses.map(b => (
                  <tr
                    key={b.id}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => router.push(`/admin/businesses/${b.id}`)}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text)' }}>{b.name}</td>
                    <td style={{ padding: '12px 16px' }}><PlanBadge plan={b.plan} /></td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>{b.lead_count}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>{b.user_count}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>{b.branch_count}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ color: b.is_active ? '#059669' : '#9ca3af', fontWeight: 600, fontSize: 12 }}>
                        {b.is_active ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => toggleBiz.mutate(b.id)}
                          style={{
                            padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)',
                            background: 'var(--bg2)', color: 'var(--text2)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          }}
                        >
                          {b.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Staff section — admin only */}
      {isAdmin && (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              Agency Staff {staffList.length > 0 && <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({staffList.length})</span>}
            </h2>
            <button
              onClick={() => setShowInviteModal(true)}
              style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            >
              + Invite Staff
            </button>
          </div>

          {staffQ.isLoading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>Loading...</div>
          ) : staffList.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>
              No agency staff yet. Invite someone to give them access to specific client accounts.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg2)' }}>
                    {['Name', 'Email', 'Assigned Businesses', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text2)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staffList.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          {s.name}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>{s.email}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {s.assigned_businesses.length === 0 ? (
                          <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>None assigned</span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {s.assigned_businesses.map(b => (
                              <span key={b.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', fontSize: 11, color: 'var(--text2)' }}>
                                {b.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ color: s.is_active ? '#059669' : '#9ca3af', fontWeight: 600, fontSize: 12 }}>
                          {s.is_active ? '● Active' : '○ Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => setAssigningStaff(s)}
                          style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text2)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                        >
                          Manage Access
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showInviteModal && <InviteStaffModal onClose={() => setShowInviteModal(false)} />}
      {assigningStaff && <AssignModal staff={assigningStaff} onClose={() => setAssigningStaff(null)} />}
    </div>
  )
}