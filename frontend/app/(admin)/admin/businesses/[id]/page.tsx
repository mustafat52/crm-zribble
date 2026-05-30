'use client'

import { useParams } from 'next/navigation'
import { useAgencyBusiness } from '@/hooks/useAgency'

export default function AgencyBusinessDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = useAgencyBusiness(id)

  if (isLoading) return <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
  if (isError || !data) return <div style={{ padding: 24, color: '#dc2626', fontSize: 13 }}>Business not found.</div>

  const { business: b, users } = data

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <a href="/admin/dashboard" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>
          ← Back to Dashboard
        </a>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginTop: 8 }}>{b.name}</h1>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{b.slug} · {b.timezone} · Plan: <strong>{b.plan}</strong></div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Leads', value: b.leads_count },
          { label: 'Team Members', value: b.users_count },
          { label: 'Branches', value: b.branches_count },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 600 }}>
          Team Members
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Name', 'Email', 'Role', 'Last Login', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{u.name}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{u.email}</td>
                <td style={{ padding: '12px 16px', fontSize: 12 }}>{u.roles?.[0]?.name ?? '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                  {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                    background: u.is_active ? '#dcfce7' : '#fee2e2',
                    color: u.is_active ? '#16a34a' : '#dc2626',
                  }}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}