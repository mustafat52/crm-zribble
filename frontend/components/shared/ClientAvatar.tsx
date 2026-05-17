interface ClientAvatarProps {
  initials: string
  color: string
  textColor: string
  size?: number
}

export default function ClientAvatar({ initials, color, textColor, size = 32 }: ClientAvatarProps) {
  return (
    <div style={{
      width: size, height: size,
      background: color, color: textColor,
      borderRadius: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 600, flexShrink: 0, letterSpacing: '0.3px',
    }}>
      {initials}
    </div>
  )
}