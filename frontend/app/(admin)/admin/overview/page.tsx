'use client'

import { useAgencyStats, useAgencyBusinesses, useToggleBusiness } from '@/hooks/useAgency'

export default function AgencyDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useAgencyStats()
  const { data: biz, isLoading: bizLoading }     = useAgencyBusinesses()
  const toggle = useToggleBusiness()

  const statCards = [
    { label: 'Total Businesses', value: stats?.total_businesses ?? '—' },
    { label: 'Active Businesses', value: stats?.active_businesses ?? '—' },
    { label: 'Total Leads', value: stats?.total_leads ?? '—' },
    { label: 'Total Users', value: stats?.total_users ?? '—' },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: 'var(--text)' }}>
        Agency Overview
      </h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {statCards.map(c => (
          <div key={c.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>{statsLoading ? '…' : c.value}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>All Businesses</div>
        {bizLoading ? (
          <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Plan', 'Leads', 'Users', 'Branches', 'Status', 'Action'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(biz?.data ?? []).map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    <a href={`/admin/businesses/${b.id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>{b.name}</a>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.slug}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{b.plan}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>{b.leads_count}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>{b.users_count}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>{b.branches_count}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: b.is_active ? '#dcfce7' : '#fee2e2', color: b.is_active ? '#16a34a' : '#dc2626' }}>
                      {b.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => toggle.mutate(b.id)} disabled={toggle.isPending} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border)', background: '#fff', color: 'var(--text)' }}>
                      {b.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}