'use client'

import React from 'react'
import { useStore } from '@/store/useStore'
import { CLIENTS, LEADS } from '@/data/mockData'

export default function Topbar() {
  const { screen, role, selectedClientId, selectedLead, goBack, showToast } = useStore()
  const client = CLIENTS.find(c => c.id === selectedClientId)
  const crumbs = buildCrumbs(screen, role, client, selectedLead)

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.trim()
    if (val.length < 2) return
    let count = 0
    Object.values(LEADS).forEach(clientLeads => {
      Object.values(clientLeads).forEach(stageLeads => {
        stageLeads.forEach(l => {
          if (l.name.toLowerCase().includes(val.toLowerCase()) || l.company.toLowerCase().includes(val.toLowerCase())) count++
        })
      })
    })
    if (count > 0) showToast(`Found ${count} lead(s) matching "${val}"`)
    else showToast(`No leads found for "${val}"`)
  }

  return (
    <div style={{
      height: 52,
      background: 'var(--bg2)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 20px', gap: 14,
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text3)' }}>
        {crumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            <span
              style={{
                color: i === crumbs.length - 1 ? 'var(--text)' : 'var(--text3)',
                fontWeight: i === crumbs.length - 1 ? 500 : 400,
                cursor: i < crumbs.length - 1 ? 'pointer' : 'default',
                transition: 'color 0.15s',
              }}
              onClick={() => i < crumbs.length - 1 && goBack()}
              onMouseEnter={e => (e.currentTarget as HTMLSpanElement).style.color = 'var(--text2)'}
              onMouseLeave={e => (e.currentTarget as HTMLSpanElement).style.color = 'var(--text3)'}
            >{crumb}</span>
            {i < crumbs.length - 1 && <span style={{ color: 'var(--border2)', fontSize: 16 }}>›</span>}
          </React.Fragment>
        ))}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          style={{
            background: 'var(--bg3)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '6px 12px',
            color: 'var(--text)',
            fontSize: 13,
            width: 210,
            transition: 'border-color 0.15s',
          }}
          placeholder="Search leads, clients…"
          onChange={handleSearch}
          onFocus={e => e.target.style.borderColor = 'var(--border2)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <div style={{
          width: 32, height: 32,
          borderRadius: '50%',
          background: 'var(--accent-bg)',
          color: 'var(--accent)',
          border: '1px solid var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 0 10px #c8f13530',
        }}>A</div>
      </div>
    </div>
  )
}

function buildCrumbs(screen: string, role: string, client: any, lead: any) {
  if (screen === 'dashboard')         return ['Dashboard']
  if (screen === 'pipeline')          return role === 'agency' && client ? ['Dashboard', client.name, 'Pipeline'] : [client ? client.name : 'My Account', 'Pipeline']
  if (screen === 'lead-detail')       return role === 'agency' ? ['Dashboard', client?.name || 'Client', lead?.name || 'Lead'] : ['Pipeline', lead?.name || 'Lead']
  if (screen === 'alert-detail')      return ['Dashboard', 'AI Alerts', 'Detail']
  if (screen === 'attention-detail')  return ['Dashboard', 'Action Required']
  if (screen === 'leads')             return ['All Leads']
  if (screen === 'alerts')            return ['AI Alerts']
  return ['Dashboard']
}