'use client'

interface WaVariable {
  index: number
  description: string
  example: string
}

interface WaTemplate {
  id: string
  name: string
  category: string
  language: string
  body_text: string
  variables: WaVariable[]
  template_id: string | null
  is_active: boolean
}

import React from 'react'
import { useAuthStore } from '@/store/useAuthStore'

const CATEGORY_COLOR: Record<string, string> = {
  UTILITY:        '#7c3aed',
  MARKETING:      '#d97706',
  AUTHENTICATION: '#059669',
}

export default function AdminWhatsAppPage() {
  const token = useAuthStore(s => s.token) ?? ''

  const [templates, setTemplates] = React.useState<WaTemplate[]>([])
  const [loading,   setLoading]   = React.useState(true)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editValue, setEditValue] = React.useState('')
  const [saving,    setSaving]    = React.useState(false)
  const [toast,     setToast]     = React.useState('')

  const API = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000') + '/api/v1'

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/whatsapp/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setTemplates(Array.isArray(data) ? data : [])
    } catch {
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [API, token])

  React.useEffect(() => { load() }, [load])

  const saveTemplateId = async (id: string) => {
    setSaving(true)
    try {
      await fetch(`${API}/whatsapp/templates/${id}`, {
        method:  'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ template_id: editValue.trim() || null }),
      })
      setEditingId(null)
      setEditValue('')
      await load()
      showToast('Template ID saved.')
    } catch {
      showToast('Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (id: string, current: boolean) => {
    try {
      await fetch(`${API}/whatsapp/templates/${id}`, {
        method:  'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ is_active: !current }),
      })
      await load()
      showToast(current ? 'Template deactivated.' : 'Template activated.')
    } catch {
      showToast('Failed to update.')
    }
  }

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
          WhatsApp Templates
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
          Manage Meta-approved message templates. Once a template is approved by Meta,
          paste its exact name into the Template ID field to activate it.
        </p>
      </div>

      {/* Info banner */}
      <div style={{
        padding: '12px 16px', borderRadius: 8, marginBottom: 24,
        background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 13, color: '#1e40af',
      }}>
        <strong>Agency-only panel.</strong> Business owners do not see this page.
        They only control which notification types are on/off from their Settings.
        Template IDs here must exactly match the approved template names in Meta Business Manager.
      </div>

      {toast && (
        <div style={{
          background: '#dcfce7', color: '#166534', border: '1px solid #86efac',
          borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13,
        }}>
          {toast}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 32, color: 'var(--text3)', fontSize: 14 }}>Loading templates…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {templates.map(t => (
            <div key={t.id} style={{
              border: '1px solid var(--border)',
              borderRadius: 10, padding: 20,
              background: t.is_active ? 'var(--bg)' : 'var(--bg2)',
              opacity: t.is_active ? 1 : 0.6,
            }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', fontFamily: 'monospace' }}>
                  {t.name}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                  color: '#fff', background: CATEGORY_COLOR[t.category] ?? '#6b7280',
                }}>
                  {t.category}
                </span>
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                  background: t.is_active ? '#dcfce7' : '#fee2e2',
                  color:      t.is_active ? '#166534' : '#991b1b',
                }}>
                  {t.is_active ? 'Active' : 'Inactive'}
                </span>
                {t.template_id && (
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                    background: '#d1fae5', color: '#065f46',
                  }}>
                    ✓ ID Set
                  </span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)' }}>
                  {t.language.toUpperCase()} · {t.variables?.length ?? 0} variable{t.variables?.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Body text */}
              <div style={{
                fontSize: 13, color: 'var(--text2)', background: 'var(--bg2)',
                borderRadius: 6, padding: '10px 12px', marginBottom: 12,
                whiteSpace: 'pre-wrap', lineHeight: 1.6,
              }}>
                {t.body_text}
              </div>

              {/* Variables */}
              {t.variables?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {t.variables.map((v: WaVariable) => (
                    <span key={v.index} style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 20,
                      background: '#ede9fe', color: '#5b21b6',
                    }}>
                      {`{{${v.index}}}`} = {v.description}
                    </span>
                  ))}
                </div>
              )}

              {/* Template ID row */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                paddingTop: 12, borderTop: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 12, color: 'var(--text3)', minWidth: 90, fontWeight: 500 }}>
                  Template ID:
                </span>
                {editingId === t.id ? (
                  <>
                    <input
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      placeholder="Paste exact Meta template name (e.g. lead_acknowledgement)"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && saveTemplateId(t.id)}
                      style={{
                        flex: 1, fontSize: 13, padding: '6px 10px',
                        border: '1px solid var(--border)', borderRadius: 6,
                        background: 'var(--bg)', color: 'var(--text)', outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => saveTemplateId(t.id)}
                      disabled={saving}
                      style={{
                        padding: '6px 16px', fontSize: 12, fontWeight: 600,
                        borderRadius: 6, border: 'none',
                        background: '#7c3aed', color: '#fff', cursor: 'pointer',
                      }}
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditValue('') }}
                      style={{
                        padding: '6px 14px', fontSize: 12, borderRadius: 6,
                        background: 'var(--bg2)', color: 'var(--text2)',
                        border: '1px solid var(--border)', cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{
                      flex: 1, fontSize: 13,
                      color:      t.template_id ? '#059669' : 'var(--text3)',
                      fontFamily: t.template_id ? 'monospace' : 'inherit',
                    }}>
                      {t.template_id ?? '— not set (messages will not send until this is filled in)'}
                    </span>
                    <button
                      onClick={() => { setEditingId(t.id); setEditValue(t.template_id ?? '') }}
                      style={{
                        padding: '6px 14px', fontSize: 12, borderRadius: 6,
                        background: 'var(--bg2)', color: 'var(--text2)',
                        border: '1px solid var(--border)', cursor: 'pointer',
                      }}
                    >
                      {t.template_id ? 'Edit' : 'Set ID'}
                    </button>
                    <button
                      onClick={() => toggleActive(t.id, t.is_active)}
                      style={{
                        padding: '6px 14px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
                        background: 'var(--bg)',
                        color:  t.is_active ? '#991b1b' : '#166534',
                        border: `1px solid ${t.is_active ? '#fca5a5' : '#86efac'}`,
                      }}
                    >
                      {t.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}