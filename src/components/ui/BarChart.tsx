interface BarItem { name: string; val: number }

interface Props { data: BarItem[]; color: string }

export function BarChart({ data, color }: Props) {
  const max = Math.max(...data.map((d) => d.val), 1)
  return (
    <div className="flex flex-col gap-3 sm:gap-2.5">
      {data.map((d) => (
        <div
          key={d.name}
          className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2.5"
        >
          <div className="text-xs text-muted2 font-medium sm:w-28 sm:text-right sm:shrink-0 truncate">
            {d.name}
          </div>
          <div className="flex-1 bg-border rounded h-5 overflow-hidden">
            <div
              className="h-full rounded flex items-center pl-2"
              style={{
                width: `${(d.val / max) * 100}%`,
                background: `linear-gradient(to right,${color}99,${color})`,
              }}
            >
              <span className="font-mono text-[10px] text-white font-bold whitespace-nowrap">
                {d.val.toLocaleString('en-US')}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
