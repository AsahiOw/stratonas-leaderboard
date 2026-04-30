interface Props {
  icon: string
  label: string
  value: string | number
  sub?: string
  color?: string
}

export function StatCard({ icon, label, value, sub, color = 'var(--accent)' }: Props) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '18px 20px', boxShadow: `0 0 28px ${color}10`,
    }}>
      <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
      <div style={{
        fontSize: 20, fontWeight: 700, color, fontFamily: 'var(--mono)',
        lineHeight: 1.2, wordBreak: 'break-word',
      }}>
        {value}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 5 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}
