interface Props { rank: number; size?: 'sm' | 'md' }

export function RankBadge({ rank, size = 'md' }: Props) {
  if (rank === 1) return <span style={{ fontSize: size === 'sm' ? 16 : 20 }}>🥇</span>
  if (rank === 2) return <span style={{ fontSize: size === 'sm' ? 16 : 20 }}>🥈</span>
  if (rank === 3) return <span style={{ fontSize: size === 'sm' ? 16 : 20 }}>🥉</span>
  return (
    <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)', fontSize: size === 'sm' ? 11 : 13 }}>
      #{rank}
    </span>
  )
}
