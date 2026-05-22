import type { Metadata } from 'next'
import SettingsView from '@/components/modules/SettingsView'

export const metadata: Metadata = {
  title: 'Settings — LeadOS',
}

export default function SettingsPage() {
  return <SettingsView />
}