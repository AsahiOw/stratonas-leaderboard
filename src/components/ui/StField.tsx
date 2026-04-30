interface Props { label: string; children: React.ReactNode; span2?: boolean }

export function StField({ label, children, span2 }: Props) {
  return (
    <div className={`mb-3.5 ${span2 ? 'sm:col-span-2' : ''}`}>
      <label className="block text-[11px] font-semibold text-muted2 mb-1.5 tracking-[0.07em]">
        {label}
      </label>
      {children}
    </div>
  )
}

export const inputClass =
  'w-full bg-card2 border border-border2 rounded-lg px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-accent placeholder:text-muted'
