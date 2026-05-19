'use client'

import { useState } from 'react'
import { getAIAnswer } from '@/lib/utils'


export default function AskAIBar({ placeholder = 'Ask AI anything…', defaultQuery = '' }) {
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)

  function ask(q : string) {
    const text = q || query || defaultQuery
    if (!text.trim()) return
    setAnswer(getAIAnswer(text))
  }

  return (
    <div style={{ marginTop: 'auto' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--bg3)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '6px 10px',
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: '50%',
          background: 'var(--accent-bg)',
          border: '1.5px solid var(--accent)',
          flexShrink: 0,
        }} />
        <input
          style={{ flex: 1, border: 'none', outline: 'none', color: 'var(--text)', fontSize: 12, background: 'transparent' }}
          placeholder={placeholder}
          value={query}
          onChange={e => setQuery(e.currentTarget.value)}
          onKeyDown={e => e.key === 'Enter' && ask(query)}
        />
        <button
          style={{
            padding: '4px 8px',
            background: 'var(--accent-bg)',
            color: 'var(--accent)',
            borderRadius: 5,
            fontSize: 11,
            border: 'none',
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          onClick={() => ask(query)}
        >Ask ↗</button>
      </div>
      {answer && (
        <div className="ai-response-box" style={{ marginTop: 8 }}>
          <div className="ai-label">AI Answer</div>
          {answer}
        </div>
      )}
    </div>
  )
}
