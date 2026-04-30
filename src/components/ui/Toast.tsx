interface Props { message: string }

export function Toast({ message }: Props) {
  return (
    <div className="fixed bottom-7 left-1/2 -translate-x-1/2 bg-card2 border border-border2 rounded-lg px-5 py-2.5 text-[13px] font-semibold text-green shadow-[0_4px_16px_rgba(0,0,0,0.4)] z-[500] whitespace-nowrap">
      ✓ {message}
    </div>
  )
}
