interface Props { initials: string; color?: string; size?: number }

export function Avatar({ initials, color = 'var(--accent)', size = 32 }: Props) {
  const isLarge = size > 40
  return (
    <div
      className={`flex items-center justify-center font-mono font-bold shrink-0 border ${
        isLarge ? 'rounded-xl text-sm' : 'rounded-lg text-[10px]'
      }`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg,${color}33,${color}66)`,
        borderColor: `${color}55`,
        color,
      }}
    >
      {initials}
    </div>
  )
}
