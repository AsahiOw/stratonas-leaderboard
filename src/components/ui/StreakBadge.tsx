interface Props { streak: number }

export function StreakBadge({ streak }: Props) {
  if (!streak) return <span className="text-muted text-xs">—</span>
  const hot = streak >= 5
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold font-mono border ${
        hot
          ? 'bg-gold/15 text-gold border-gold/30'
          : 'bg-accent/[0.12] text-accent border-accent/30'
      }`}
    >
      {hot ? '🔥' : '⚡'} {streak}W
    </span>
  )
}
