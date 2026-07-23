'use client'
// ZRIBBLE sign-in loader. Shown the entire time the login request is in flight
// and until the redirect fires. Trendy, ownable, spinner-free — the logo's own
// floating dot becomes the indeterminate progress indicator.
import { ZribbleLogo } from './ZribbleLogo'

export function LoginLoader() {
  return (
    <div
      role="status" aria-live="polite" aria-label="Signing you in"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, background: 'black',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 24, animation: 'zr-overlay-in 220ms ease both',
      }}
    >
      {/* 1 + 3: the real mark, revealed L→R by a shimmering mask */}
      <div style={{ position: 'relative' }}>
        <div className="zr-loader-word" data-zr-anim style={{
          // reveal mask sweeps the logo like it's being written
          WebkitMaskImage: 'linear-gradient(90deg, #000 0 40%, #0006 55%, #0000 70%)',
          maskImage:       'linear-gradient(90deg, #000 0 40%, #0006 55%, #0000 70%)',
          WebkitMaskSize: '250% 100%', maskSize: '250% 100%',
          animation: 'zr-shimmer 1.4s ease-in-out infinite',
        }}>
          <ZribbleLogo height={350} variant="light" />
        </div>
      </div>

      {/* 2: the floating dot rides a track = indeterminate progress (the anti-spinner) */}
      <div aria-hidden style={{ position: 'relative', width: 180, height: 30 }}>
        <div style={{
          position: 'absolute', inset: 0, top: 3, height: 2,
          background: '#ffffff1a', borderRadius: 2,
        }} />
        <span data-zr-anim style={{
          position: 'absolute', top: 0, width: 20, height: 20, borderRadius: '50%',
          background: 'var(--brand-pink)',
          boxShadow: '0 0 12px var(--brand-pink)',
          animation: 'zr-track 1.1s cubic-bezier(.65,0,.35,1) infinite',
        }} />
      </div>

      <span style={{ color: 'var(--sidebar-text2)', fontSize: 13, letterSpacing: '.02em' }}>
        Signing you in…
      </span>
    </div>
  )
}
{'ZRIBBLE'.split('').map((ch, i) => (
  <span key={i} data-zr-anim style={{
    display: 'inline-block', fontFamily: 'var(--font-sans)', fontWeight: 700,
    fontSize: 44, letterSpacing: '.04em', color: '#fff',
    animation: `zr-pop .5s cubic-bezier(.34,1.56,.64,1) ${i * 0.07}s both`,
  }}>{ch}</span>
))}
<span data-zr-anim style={{ color: 'var(--brand-pink)', fontSize: 44, fontWeight: 700,
  animation: `zr-pop .5s cubic-bezier(.34,1.56,.64,1) .5s both, zr-dot-pulse 1s .9s ease-in-out infinite` }}>.</span>
