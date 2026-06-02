'use client'

import { useState } from 'react'
import {
  useAutomationSettings,
  useUpdateAutomationSettings,
  type AutomationLog,
  type AutomationSummaryRow,
} from '@/hooks/useAutomation'
import { useAuthStore } from '@/store/useAuthStore'

// ── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function automationLabel(type: string): string {
  if (type === 'stale_lead_nudge') return 'Stale Lead Nudge'
  if (type === 'followup_customer_email') return 'Follow-Up Customer Email'
  return type
}

function statusPill(status: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    sent:    { bg: '#dcfce7', color: '#166534', label: 'Sent' },
    failed:  { bg: '#fee2e2', color: '#991b1b', label: 'Failed' },
    skipped: { bg: '#f3f4f6', color: '#6b7280', label: 'Skipped' },
  }
  const s = map[status] ?? map['skipped']
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 600,
      padding: '2px 8px', borderRadius: 99, letterSpacing: '0.03em' }}>
      {s.label}
    </span>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SummaryCard({
  label, sentCount, failedCount,
}: { label: string; sentCount: number; failedCount: number }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '16px 20px', flex: 1, minWidth: 220 }}>
      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>
        {label}
      </p>
      <div style={{ display: 'flex', gap: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>{sentCount}</div>
          <div style={{ fontSize: 11, color: 'var(--text2)' }}>sent (7d)</div>
        </div>
        {failedCount > 0 && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#ef4444' }}>{failedCount}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>failed (7d)</div>
          </div>
        )}
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <tr>
      {[1, 2, 3, 4].map((i) => (
        <td key={i} style={{ padding: '10px 14px' }}>
          <div style={{ height: 14, background: 'var(--bg2)', borderRadius: 4,
            width: i === 2 ? '60%' : '80%', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </td>
      ))}
    </tr>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function AutomationView() {
  const { data, isLoading } = useAutomationSettings()
  const updateMutation      = useUpdateAutomationSettings()
  const user                = useAuthStore((s) => s.user)
  const isOwner             = user?.roles?.includes('owner') ?? false

  const [staleDays, setStaleDays] = useState<number | ''>('')
  const [saved, setSaved]         = useState(false)

  // Populate local state once data arrives
  const currentStaleDays = data?.stale_lead_days ?? 3

  function getSummaryCount(type: string, status: string): number {
    if (!data?.summary) return 0
    return (data.summary as AutomationSummaryRow[]).find(
      (r) => r.automation_type === type && r.status === status
    )?.total ?? 0
  }

  async function handleSave() {
    const days = staleDays === '' ? currentStaleDays : staleDays
    await updateMutation.mutateAsync(days as number)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900 }}>

      {/* ── Page Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
          Automations
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text2)' }}>
          Email automations that run in the background. WhatsApp automations will be
          enabled when WhatsApp credentials are connected.
        </p>
      </div>

      {/* ── Active Automations ── */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)',
          textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px' }}>
          Active Automations
        </h2>

        {/* Automation 1 — Stale Lead Nudge */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '20px 24px', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>⏰</span>
                <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>
                  Stale Lead Nudge
                </span>
                <span style={{ background: '#dcfce7', color: '#166534', fontSize: 11,
                  fontWeight: 600, padding: '2px 8px', borderRadius: 99 }}>
                  Active
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                Emails the assigned salesperson (or business owner) when a lead has had no
                activity for the configured number of days. Runs daily at 9:00 AM.
                <br />
                <strong style={{ color: 'var(--text)' }}>Channel:</strong> Email only
                &nbsp;·&nbsp;
                <strong style={{ color: 'var(--text)' }}>Frequency:</strong> Once per lead per 24 hours
              </p>
            </div>

            {/* Stale days config — owner only */}
            {isOwner && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8,
                minWidth: 200, alignItems: 'flex-end' }}>
                <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>
                  Trigger after (days of no activity)
                </label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={staleDays === '' ? currentStaleDays : staleDays}
                    onChange={(e) => setStaleDays(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{ width: 70, padding: '6px 10px', background: 'var(--bg2)',
                      border: '1px solid var(--border)', borderRadius: 6,
                      color: 'var(--text)', fontSize: 14, textAlign: 'center' }}
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSave}
                    disabled={updateMutation.isPending || isLoading}
                    style={{ padding: '6px 14px', background: saved ? '#16a34a' : 'var(--accent)',
                      color: '#fff', border: 'none', borderRadius: 6,
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      opacity: updateMutation.isPending ? 0.7 : 1 }}>
                    {updateMutation.isPending ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
                  </button>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                  Set to 0 to disable this automation
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Automation 2 — Follow-Up Customer Email */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 18, marginTop: 2 }}>📧</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>
                  Follow-Up Customer Email
                </span>
                <span style={{ background: '#dcfce7', color: '#166534', fontSize: 11,
                  fontWeight: 600, padding: '2px 8px', borderRadius: 99 }}>
                  Active
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                When a follow-up reminder fires for a lead that has an email address,
                the customer automatically receives a courteous &quot;we will be in touch&quot; email.
                Fires once per follow-up — never duplicates.
                <br />
                <strong style={{ color: 'var(--text)' }}>Channel:</strong> Email only
                &nbsp;·&nbsp;
                <strong style={{ color: 'var(--text)' }}>Trigger:</strong> On follow-up due date
                &nbsp;·&nbsp;
                <strong style={{ color: 'var(--text)' }}>Condition:</strong> Lead must have email
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Coming Soon ── */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)',
          textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px' }}>
          Coming Soon
        </h2>
        <div style={{ background: 'var(--bg)', border: '1px dashed var(--border)',
          borderRadius: 8, padding: '20px 24px', display: 'flex',
          alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 24 }}>💬</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>
              WhatsApp Automations
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text2)' }}>
              Auto WhatsApp message to customer on follow-up date. Stale lead nudge via WhatsApp
              to salesperson. Available once WhatsApp credentials are connected.
            </p>
          </div>
        </div>
      </section>

      {/* ── 7-day Summary ── */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)',
          textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px' }}>
          Last 7 Days
        </h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <SummaryCard
            label="Stale Lead Nudges"
            sentCount={getSummaryCount('stale_lead_nudge', 'sent')}
            failedCount={getSummaryCount('stale_lead_nudge', 'failed')}
          />
          <SummaryCard
            label="Customer Follow-Up Emails"
            sentCount={getSummaryCount('followup_customer_email', 'sent')}
            failedCount={getSummaryCount('followup_customer_email', 'failed')}
          />
        </div>
      </section>

      {/* ── Recent Automation Log ── */}
      <section>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)',
          textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px' }}>
          Recent Activity
        </h2>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
                {['Automation', 'Recipient', 'Status', 'When'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px',
                    fontSize: 11, fontWeight: 600, color: 'var(--text2)',
                    textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : !data?.recent_logs?.length ? (
                <tr>
                  <td colSpan={4} style={{ padding: '32px 14px', textAlign: 'center',
                    color: 'var(--text2)', fontSize: 13 }}>
                    No automation runs yet. Automations fire automatically — check back after
                    the next scheduled run.
                  </td>
                </tr>
              ) : (
                (data.recent_logs as AutomationLog[]).map((log, i) => (
                  <tr key={i}
                    style={{ borderBottom: '1px solid var(--border)',
                      transition: 'background 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '10px 14px', color: 'var(--text)', fontWeight: 500 }}>
                      {automationLabel(log.automation_type)}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text2)' }}>
                      {log.recipient_email}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {statusPill(log.status)}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text2)' }}>
                      {relativeTime(log.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}