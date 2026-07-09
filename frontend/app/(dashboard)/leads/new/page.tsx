'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'
import { useBranches } from '@/hooks/useBranches'

// T86: Added branch_id to the new lead form.
// Without branch_id, manually created leads get branch_id = null.
// BranchScope filters to WHERE branch_id = user.branch_id, so branch-scoped
// executives and managers would never see these leads — they're invisible except
// to the owner who has no branch filter.
//
// Fix: Pre-fill branch_id from the authenticated user's branch_id for non-owners.
// For owners (no branch_id), show a dropdown of all active branches.

export default function NewLeadPage() {
  const router  = useRouter()
  const qc      = useQueryClient()
  const user    = useAuthStore(s => s.user)
  const isOwner = user?.roles?.includes('owner')

  // For owners: fetch all branches for the dropdown
  const { branches } = useBranches()

  const [form, setForm] = useState({
    name:         '',
    mobile:       '',
    email:        '',
    source:       'manual',
    city:         '',
    interested_in: '',
    // T86: Initialize branch_id from the user's own branch (for non-owners),
    // or empty string for owners who will pick from a dropdown.
    branch_id: isOwner ? '' : (user?.branch_id ?? ''),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit() {
    if (!form.name || !form.mobile) { setError('Name and mobile are required.'); return }
    setLoading(true); setError('')

    try {
      // Build payload — only include branch_id if it's set
      const payload: Record<string, string> = {
        name:          form.name,
        mobile:        form.mobile,
        source:        form.source,
        email:         form.email,
        city:          form.city,
        interested_in: form.interested_in,
      }
      if (form.branch_id) {
        payload.branch_id = form.branch_id
      }

      await api.post('/leads', payload)
      await qc.invalidateQueries({ queryKey: ['leads'] })
      await qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      await qc.invalidateQueries({ queryKey: ['action-queue'] })
      await qc.invalidateQueries({ queryKey: ['recent-activity'] })
      router.push('/leads')
    } catch (e: unknown) {
      const err = e as Error
      setError(err.message ?? 'Failed to create lead.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    fontSize: 14,
    boxSizing: 'border-box',
    color: 'var(--text)',
    background: 'var(--bg)',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    marginBottom: 6,
    color: 'var(--text2)',
    fontWeight: 500,
  }

  return (
    <div style={{ maxWidth: 560, margin: '40px auto', padding: '0 24px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24, color: 'var(--text)' }}>
        Add New Lead
      </h1>

      {error && (
        <p style={{
          color: '#dc2626', marginBottom: 16, fontSize: 13,
          padding: '10px 12px', background: '#fef2f2',
          border: '1px solid #fecaca', borderRadius: 6,
        }}>
          {error}
        </p>
      )}

      {[
        { label: 'Name *',        key: 'name',          placeholder: 'Full name' },
        { label: 'Mobile *',      key: 'mobile',        placeholder: '+91...' },
        { label: 'Email',         key: 'email',         placeholder: 'email@example.com' },
        { label: 'City',          key: 'city',          placeholder: 'Mumbai' },
        { label: 'Interested In', key: 'interested_in', placeholder: 'Service or product' },
      ].map(({ label, key, placeholder }) => (
        <div key={key} style={{ marginBottom: 16 }}>
          <label style={labelStyle}>{label}</label>
          <input
            placeholder={placeholder}
            value={form[key as keyof typeof form]}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            style={inputStyle}
          />
        </div>
      ))}

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Source</label>
        <select
          value={form.source}
          onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
          style={inputStyle}
        >
          {['manual','website','whatsapp','instagram','facebook','referral','other'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* T86: Branch selector — only shown to owners; non-owners auto-assigned their branch */}
      {isOwner && (
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Branch</label>
          <select
            value={form.branch_id}
            onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}
            style={inputStyle}
          >
            <option value="">— No branch (visible to owner only) —</option>
            {branches.filter(b => b.is_active).map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            Assign a branch so team members can see this lead in their filtered view.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => router.push('/leads')}
          style={{
            padding: '10px 20px', borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--bg)', color: 'var(--text)',
            cursor: 'pointer', fontSize: 14,
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            padding: '10px 24px', borderRadius: 6,
            background: loading ? 'var(--border2)' : 'var(--accent)',
            color: 'white', border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 600, fontSize: 14,
          }}
        >
          {loading ? 'Saving...' : 'Create Lead'}
        </button>
      </div>
    </div>
  )
}
