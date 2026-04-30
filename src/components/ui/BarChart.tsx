interface BarItem { name: string; val: number }

interface Props { data: BarItem[]; color: string }

export function BarChart({ data, color }: Props) {
  const max = Math.max(...data.map((d) => d.val), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {data.map((d) => (
        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 112, fontSize: 12, color: 'var(--muted2)',
            textAlign: 'right', flexShrink: 0, fontWeight: 500,
          }}>
            {d.name}
          </div>
          <div style={{
            flex: 1, background: 'var(--border)', borderRadius: 4, height: 20, overflow: 'hidden',
          }}>
            <div style={{
              width: `${(d.val / max) * 100}%`, height: '100%',
              background: `linear-gradient(to right,${color}99,${color})`,
              borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 7,
            }}>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 10, color: '#fff',
                fontWeight: 700, whiteSpace: 'nowrap',
              }}>
                {d.val.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
