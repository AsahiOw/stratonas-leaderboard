interface Props { label: string; children: React.ReactNode; span2?: boolean }

export function StField({ label, children, span2 }: Props) {
  return (
    <div style={{ marginBottom: 14, gridColumn: span2 ? 'span 2' : undefined }}>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 600,
        color: 'var(--muted2)', marginBottom: 5, letterSpacing: '0.07em',
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}

export const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--card2)', border: '1px solid var(--border2)',
  borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 14,
  fontFamily: 'Space Grotesk, sans-serif', outline: 'none',
}
