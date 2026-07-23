'use client'
// Full-screen branded overlay shown between successful login and redirect.
// The ZRIBBLE wordmark draws in; the dot pulses — signals "working", fast.
export function LoginSuccessOverlay() {
  return (
    <div
      role="status" aria-live="polite" aria-label="Signing you in"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--brand-ink)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 20, animation: 'zr-overlay-in 260ms ease both',
      }}
    >
      <div data-zr-anim style={{ animation: 'zr-word-draw 700ms ease both' }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 40, letterSpacing: '0.05em', color: '#fff' }}>
          ZRIBBLE
          <span data-zr-anim style={{ color: 'var(--brand-pink)', display: 'inline-block', animation: 'zr-dot-pulse 900ms ease-in-out infinite' }}>.</span>
        </span>
      </div>
      {/* three progress dots */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} data-zr-anim style={{
            width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-pink)',
            animation: `zr-dot-pulse 1s ease-in-out ${i * 0.15}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}