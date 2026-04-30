interface Props { server: string }

export function ServerBadge({ server }: Props) {
  const isGlobal = server === 'Global' || server === 'GLOBAL' || server === 'global'
  const label = isGlobal ? 'GLOBAL' : 'JP'
  return (
    <span
      className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-[0.1em] border ${
        isGlobal
          ? 'bg-accent/[0.18] text-accent border-accent/40'
          : 'bg-red/[0.18] text-red border-red/40'
      }`}
    >
      {label}
    </span>
  )
}
