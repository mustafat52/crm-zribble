'use client'

import { useAgencyBusinesses, useToggleBusiness, AgencyBusiness } from '@/hooks/useAgency'
import { useAuthStore } from '@/store/useAuthStore'
import { useRouter } from 'next/navigation'

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

export default function AdminBusinessesPage() {
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.roles?.includes('agency_admin') ?? false
  const router = useRouter()

  const businessesQ = useAgencyBusinesses()
  const toggleBiz = useToggleBusiness()

  const businesses: AgencyBusiness[] = businessesQ.data?.data ?? []

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
          Businesses
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text2)' }}>
          {isAdmin ? 'All client businesses on the platform' : 'Businesses assigned to your account'}
        </p>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
            All Businesses{businesses.length > 0 && (
              <span style={{ color: 'var(--text3)', fontWeight: 400 }}> ({businesses.length})</span>
            )}
          </h2>
        </div>

        {businessesQ.isLoading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text3)' }}>Loading...</div>
        ) : businesses.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text3)' }}>
            {isAdmin ? 'No businesses yet.' : 'No businesses assigned to your account.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  {['Name', 'Plan', 'Leads', 'Users', 'Branches', 'Status', ...(isAdmin ? ['Action'] : [])].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left', fontWeight: 600,
                      color: 'var(--text2)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {businesses.map(b => (
                  <tr
                    key={b.id}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => router.push(`/admin/businesses/${b.id}`)}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
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
                            background: 'var(--bg2)', color: 'var(--text2)', cursor: 'pointer',
                            fontSize: 12, fontWeight: 600,
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
    </div>
  )
}