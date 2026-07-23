import Image from 'next/image'

// Real ZRIBBLE mark. `variant="light"` renders the white-letter version for
// dark backgrounds (the brand panel + loader). Aspect ratio ~ 6.3:1.
export function ZribbleLogo({
  height = 28,
  variant = 'dark',   // 'dark' = black letters (light bg) · 'light' = white letters (dark bg)
}: { height?: number; variant?: 'dark' | 'light' }) {
  const src = variant === 'light' ? '/zribble-light.png' : '/zribble.png'
  return (
    <Image
      src={src}
      alt="ZRIBBLE"
      height={height}
      width={Math.round(height * 6.3)}   // 6.3:1 aspect ratio, rounded to nearest whole pixel for best
      priority
      style={{
        height,
        width: 'auto',
        objectFit: 'contain',
        userSelect: 'none',
        // Fallback if you did NOT export a light version — invert the black PNG:
        ...(variant === 'light' && !LIGHT_ASSET ? { filter: 'invert(1) hue-rotate(180deg) saturate(1.1)' } : {}),
      }}
    />
  )
}

// Flip to true once /public/zribble-light.png exists.
const LIGHT_ASSET = false