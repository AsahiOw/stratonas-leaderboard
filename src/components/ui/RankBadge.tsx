interface Props { rank: number; size?: 'sm' | 'md' }

export function RankBadge({ rank, size = 'md' }: Props) {
  if (rank === 1) return <span className={size === 'sm' ? 'text-base' : 'text-xl'}>🥇</span>
  if (rank === 2) return <span className={size === 'sm' ? 'text-base' : 'text-xl'}>🥈</span>
  if (rank === 3) return <span className={size === 'sm' ? 'text-base' : 'text-xl'}>🥉</span>
  return (
    <span className={`font-mono text-muted ${size === 'sm' ? 'text-[11px]' : 'text-[13px]'}`}>
      #{rank}
    </span>
  )
}
