interface Props { initials: string; color?: string; size?: number }

export function Avatar({ initials, color = 'var(--accent)', size = 32 }: Props) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size > 40 ? 12 : 8, flexShrink: 0,
      background: `linear-gradient(135deg,${color}33,${color}66)`,
      border: `1px solid ${color}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--mono)', fontSize: size > 40 ? 14 : 10, fontWeight: 700, color,
    }}>
      {initials}
    </div>
  )
}
