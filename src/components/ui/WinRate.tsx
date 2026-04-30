interface Props { w: number; l: number }

export function WinRate({ w, l }: Props) {
  const pct = w + l > 0 ? Math.round((w / (w + l)) * 100) : 0
  return (
    <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
      <span style={{ color: 'var(--green)' }}>{w}W</span>
      <span style={{ color: 'var(--muted)', margin: '0 2px' }}>/</span>
      <span style={{ color: 'var(--red)' }}>{l}L</span>
      <span style={{ color: 'var(--muted2)', marginLeft: 5, fontSize: 11 }}>{pct}%</span>
    </span>
  )
}
