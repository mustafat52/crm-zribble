'use client'

import { useStore } from '@/store/useStore'
import Sidebar from '@/components/shared/Sidebar'
import Topbar from '@/components/shared/Topbar'
import Toast from '@/components/shared/Toast'
import AgencyDashboard from '@/components/modules/AgencyDashboard'
import ClientDashboard from '@/components/modules/ClientDashboard'

export default function Home() {
  const { screen, role } = useStore()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar />
        <main style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {role === 'agency' && screen === 'dashboard' && <AgencyDashboard />}
          {role === 'client' && screen === 'dashboard' && <ClientDashboard />}
        </main>
      </div>
      <Toast />
    </div>
  )
}