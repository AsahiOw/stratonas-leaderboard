interface Props { w: number; l: number }

export function WinRate({ w, l }: Props) {
  const pct = w + l > 0 ? Math.round((w / (w + l)) * 100) : 0
  return (
    <span className="font-mono text-xs">
      <span className="text-green">{w}W</span>
      <span className="text-muted mx-0.5">/</span>
      <span className="text-red">{l}L</span>
      <span className="text-muted2 ml-1.5 text-[11px]">{pct}%</span>
    </span>
  )
}
