'use client'

import { useAgencyBusiness } from '@/hooks/useAgency'
import { useParams, useRouter } from 'next/navigation'

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: b, isLoading } = useAgencyBusiness(id)

  if (isLoading) {
    return <div style={{ padding: 32, color: 'var(--text3)' }}>Loading...</div>
  }

  if (!b) {
    return <div style={{ padding: 32, color: 'var(--text3)' }}>Business not found.</div>
  }

  const statCards = [
    { label: 'Total Leads', value: b.lead_count },
    { label: 'Team Members', value: b.user_count },
    { label: 'Branches', value: b.branch_count },
  ]

  const members = b.members ?? []

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>

      {/* Back */}
      <button
        onClick={() => router.push('/admin/overview')}
        style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 16 }}
      >
        ← Back to Overview
      </button>

      {/* Header */}
      <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginTop: 8 }}>{b.name}</h1>
      <div style={{ fontSize: 13, color: 'var(--text2)' }}>
        {b.slug} · {b.timezone} · Plan: <strong>{b.plan}</strong>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, margin: '24px 0' }}>
        {statCards.map(card => (
          <div key={card.label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</p>
            <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Members table */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            Team Members {members.length > 0 && <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({members.length})</span>}
          </h2>
        </div>

        {members.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>No team members yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  {['Name', 'Email', 'Role', 'Status', 'Last Login'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text2)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text)' }}>{u.name}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>{u.email}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>{u.roles?.[0] ?? '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ color: u.is_active ? '#059669' : '#9ca3af', fontWeight: 600, fontSize: 12 }}>
                        {u.is_active ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}