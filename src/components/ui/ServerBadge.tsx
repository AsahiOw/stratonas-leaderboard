interface Props { server: string }

export function ServerBadge({ server }: Props) {
  const isGlobal = server === 'Global' || server === 'GLOBAL' || server === 'global'
  const isJapan = server === 'Japan' || server === 'JAPAN' || server === 'jp' || server === 'JP'
  const label = isGlobal ? 'GLOBAL' : isJapan ? 'JP' : server.toUpperCase()
  return (
    <span
      className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-[0.1em] border ${
        isJapan
          ? 'bg-red/[0.18] text-red border-red/40'
          : 'bg-accent/[0.18] text-accent border-accent/40'
      }`}
    >
      {label}
    </span>
  )
}
