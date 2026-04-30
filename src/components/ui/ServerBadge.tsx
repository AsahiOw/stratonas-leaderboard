interface Props { server: string }

export function ServerBadge({ server }: Props) {
  const isGlobal = server === 'GLOBAL' || server === 'global'
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, letterSpacing: '0.1em',
      background: isGlobal ? 'rgba(79,142,247,0.18)' : 'rgba(248,113,113,0.18)',
      color: isGlobal ? '#4f8ef7' : '#f87171',
      border: `1px solid ${isGlobal ? 'rgba(79,142,247,0.4)' : 'rgba(248,113,113,0.4)'}`,
    }}>
      {isGlobal ? 'GLOBAL' : 'JP'}
    </span>
  )
}
