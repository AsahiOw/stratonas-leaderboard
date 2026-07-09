import type { ReactNode } from 'react'

interface Props {
  icon: ReactNode
  label: string
  value: string | number
  sub?: string
  color?: string
}

export function StatCard({ icon, label, value, sub, color = 'var(--accent)' }: Props) {
  return (
    <div
      className="bg-card border border-border rounded-2xl px-5 py-4"
      style={{ boxShadow: `0 0 28px ${color}10` }}
    >
      <div className="text-muted2 mb-2">{icon}</div>
      <div
        className="font-mono font-bold text-xl leading-tight break-words"
        style={{ color }}
      >
        {value}
      </div>
      <div className="text-[13px] font-semibold text-text mt-1.5">{label}</div>
      {sub && <div className="text-[11px] text-muted mt-1">{sub}</div>}
    </div>
  )
}
