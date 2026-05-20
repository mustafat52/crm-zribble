'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function NewLeadPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', mobile: '', email: '', source: 'manual', city: '', interested_in: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!form.name || !form.mobile) { setError('Name and mobile are required.'); return }
    setLoading(true); setError('')
    try {
      await api.post('/leads', form)
      router.push('/leads')
    } catch (e: any) {
      setError(e.message ?? 'Failed to create lead.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: '40px auto', padding: '0 24px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Add New Lead</h1>
      {error && <p style={{ color: 'red', marginBottom: 16 }}>{error}</p>}
      {[
        { label: 'Name *', key: 'name', placeholder: 'Full name' },
        { label: 'Mobile *', key: 'mobile', placeholder: '+91...' },
        { label: 'Email', key: 'email', placeholder: 'email@example.com' },
        { label: 'City', key: 'city', placeholder: 'Mumbai' },
        { label: 'Interested In', key: 'interested_in', placeholder: 'Service or product' },
      ].map(({ label, key, placeholder }) => (
        <div key={key} style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text2)' }}>{label}</label>
          <input
            placeholder={placeholder}
            value={form[key as keyof typeof form]}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>
      ))}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text2)' }}>Source</label>
        <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
          style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14 }}>
          {['manual','website','whatsapp','instagram','facebook','referral','other'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={() => router.push('/leads')}
          style={{ padding: '10px 20px', borderRadius: 6, border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}>
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={loading}
          style={{ padding: '10px 24px', borderRadius: 6, background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          {loading ? 'Saving...' : 'Create Lead'}
        </button>
      </div>
    </div>
  )
}