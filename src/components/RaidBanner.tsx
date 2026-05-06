import { ServerBadge } from '@/components/ui/ServerBadge'
import { fmtDate, proxyImage } from '@/lib/utils'

const patternMap: Record<string, string> = {
  hex:     `url("data:image/svg+xml,%3Csvg width='40' height='46' viewBox='0 0 40 46' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0 L40 11.5 L40 34.5 L20 46 L0 34.5 L0 11.5Z' fill='none' stroke='%23ffffff' stroke-width='0.4' stroke-opacity='0.1'/%3E%3C/svg%3E")`,
  grid:    `url("data:image/svg+xml,%3Csvg width='30' height='30' viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='30' height='30' fill='none' stroke='%23ffffff' stroke-width='0.4' stroke-opacity='0.08'/%3E%3C/svg%3E")`,
  diamond: `url("data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='7' y='7' width='14' height='14' fill='none' stroke='%23ffffff' stroke-width='0.4' stroke-opacity='0.1' transform='rotate(45 14 14)'/%3E%3C/svg%3E")`,
  dot:     `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='10' cy='10' r='1' fill='%23ffffff' fill-opacity='0.1'/%3E%3C/svg%3E")`,
}

interface RaidBannerRaid {
  raidBoss: { name: string; description: string; image?: string | null }
  season: number
  type: { name: string }
  server: { name: string }
  terrain: { name: string }
  isActive: boolean
  color: string
  color2: string
  pattern: string
  startDate?: Date | string | null
  endDate?: Date | string | null
}

interface TopPlayer { name: string; score: number }

interface Props {
  raid: RaidBannerRaid
  topPlayer?: TopPlayer | null
}

export function RaidBanner({ raid, topPlayer }: Props) {
  return (
    <div
      className="relative overflow-hidden rounded-t-xl border border-b-0 px-4 py-4 sm:px-5 sm:py-5"
      style={{
        background: `linear-gradient(135deg,${raid.color}22 0%,${raid.color2}18 50%,#0d0d13 100%)`,
        borderColor: `${raid.color}33`,
      }}
    >
      {/* Raid boss image */}
      {raid.raidBoss.image && (
        <div
          className="absolute inset-y-0 right-0 w-4/5 sm:w-3/5 pointer-events-none"
          style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 55%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 55%)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={proxyImage(raid.raidBoss.image)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center opacity-40"
          />
        </div>
      )}
      {/* Pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: patternMap[raid.pattern] || '' }}
      />
      {/* Radial orb */}
      <div
        className="absolute -right-8 -top-8 w-44 h-44 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle,${raid.color}28 0%,transparent 70%)` }}
      />

      {/* Content */}
      <div className="relative flex flex-col gap-3 pr-24 sm:pr-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <ServerBadge server={raid.server.name} />
            <span
              className="text-[11px] font-semibold tracking-[0.07em]"
              style={{ color: `${raid.color}cc` }}
            >
              S{raid.season} · {raid.type.name.toUpperCase()} · {raid.terrain.name.toUpperCase()}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-[-0.02em] mb-1 break-words">
            {raid.raidBoss.name}
          </h2>
          <p className="text-xs text-muted2 max-w-[480px]">
            {raid.raidBoss.description}
          </p>
        </div>

        <div className="flex flex-col gap-1.5 sm:items-end sm:shrink-0 w-full sm:w-auto">
          {topPlayer && (
            <div
              className="bg-black/35 rounded-lg px-3 py-2 sm:text-right border w-full sm:w-auto"
              style={{ borderColor: `${raid.color}30` }}
            >
              <div className="text-[10px] text-muted tracking-[0.08em] font-semibold mb-0.5">
                RANK 1
              </div>
              <div className="font-bold text-sm">{topPlayer.name}</div>
              <div
                className="font-mono text-[13px] font-bold"
                style={{ color: raid.color }}
              >
                {topPlayer.score.toLocaleString()} pts
              </div>
            </div>
          )}
          <div className="bg-black/25 border border-border rounded-md px-2.5 py-1 text-[11px] text-muted font-mono w-full sm:w-auto sm:text-right">
            {fmtDate(raid.startDate)} → {fmtDate(raid.endDate)}
          </div>
        </div>
      </div>
    </div>
  )
}
