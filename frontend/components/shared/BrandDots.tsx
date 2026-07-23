// Ambient drifting dots for the login brand panel. Purely decorative, slow, quiet.
const DOTS = [
  { x: '8%', y: '23%', s: 100, c: 'var(--brand-pink)',   d: '0s'  },
  { x: '78%', y: '12%', s: 65,  c: 'var(--accent)',       d: '.4s'  },
  { x: '64%', y: '72%', s: 48, c: 'var(--brand-pink-2)', d: '.9s'  },
  { x: '22%', y: '80%', s: 63,  c: 'var(--accent)',       d: '1.3s' },
  { x: '46%', y: '40%', s: 70,  c: 'var(--brand-pink)',   d: '2.0s' },
]
export function BrandDots() {
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
      {DOTS.map((d, i) => (
        <span key={i} data-zr-anim style={{
          position: 'absolute', left: d.x, top: d.y, width: d.s, height: d.s,
          borderRadius: '50%', background: d.c, opacity: 0.65,
          animation: `zr-dot-drift 2.58s ease-in-out ${d.d} infinite`,
        }} />
      ))}
    </div>
  )
}