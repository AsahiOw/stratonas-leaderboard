interface Props { streak: number }

export function StreakBadge({ streak }: Props) {
  if (!streak) return <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      background: streak >= 5 ? 'rgba(240,192,64,0.15)' : 'rgba(79,142,247,0.12)',
      color: streak >= 5 ? 'var(--gold)' : 'var(--accent)',
      border: `1px solid ${streak >= 5 ? 'rgba(240,192,64,0.3)' : 'rgba(79,142,247,0.3)'}`,
      borderRadius: 5, padding: '2px 7px', fontSize: 11, fontWeight: 600,
      fontFamily: 'var(--mono)',
    }}>
      {streak >= 5 ? '🔥' : '⚡'} {streak}W
    </span>
  )
}
