interface Props { message: string }

export function Toast({ message }: Props) {
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--card2)', border: '1px solid var(--border2)',
      borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600,
      color: 'var(--green)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      zIndex: 500, whiteSpace: 'nowrap',
    }}>
      ✓ {message}
    </div>
  )
}
