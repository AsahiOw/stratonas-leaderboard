import { ServerBadge } from '@/components/ui/ServerBadge'
import { fmtDate } from '@/lib/utils'

const patternMap: Record<string, string> = {
  hex:     `url("data:image/svg+xml,%3Csvg width='40' height='46' viewBox='0 0 40 46' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0 L40 11.5 L40 34.5 L20 46 L0 34.5 L0 11.5Z' fill='none' stroke='%23ffffff' stroke-width='0.4' stroke-opacity='0.1'/%3E%3C/svg%3E")`,
  grid:    `url("data:image/svg+xml,%3Csvg width='30' height='30' viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='30' height='30' fill='none' stroke='%23ffffff' stroke-width='0.4' stroke-opacity='0.08'/%3E%3C/svg%3E")`,
  diamond: `url("data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='7' y='7' width='14' height='14' fill='none' stroke='%23ffffff' stroke-width='0.4' stroke-opacity='0.1' transform='rotate(45 14 14)'/%3E%3C/svg%3E")`,
  dot:     `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='10' cy='10' r='1' fill='%23ffffff' fill-opacity='0.1'/%3E%3C/svg%3E")`,
}

interface RaidBannerRaid {
  name: string
  episode?: string | null
  season?: string | null
  server: string
  status: string
  color: string
  color2: string
  pattern: string
  desc?: string | null
  startDate?: Date | string | null
  endDate?: Date | string | null
}

interface TopPlayer { name: string; score: number }

interface Props {
  raid: RaidBannerRaid
  topPlayer?: TopPlayer | null
  participantCount: number
}

export function RaidBanner({ raid, topPlayer, participantCount }: Props) {
  return (
    <div style={{
      borderRadius: '12px 12px 0 0', overflow: 'hidden', position: 'relative',
      background: `linear-gradient(135deg,${raid.color}22 0%,${raid.color2}18 50%,#0d0d13 100%)`,
      border: `1px solid ${raid.color}33`, borderBottom: 'none', padding: '20px 22px',
    }}>
      {/* Pattern overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: patternMap[raid.pattern] || '',
        pointerEvents: 'none',
      }} />
      {/* Radial orb */}
      <div style={{
        position: 'absolute', right: -30, top: -30, width: 180, height: 180,
        borderRadius: '50%',
        background: `radial-gradient(circle,${raid.color}28 0%,transparent 70%)`,
        pointerEvents: 'none',
      }} />
      {/* Content */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <ServerBadge server={raid.server} />
            <span style={{ fontSize: 11, color: `${raid.color}cc`, fontWeight: 600, letterSpacing: '0.07em' }}>
              {raid.season} · {raid.episode?.toUpperCase()}
            </span>
            {(raid.status === 'CURRENT' || raid.status === 'current') && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                background: 'rgba(52,211,153,0.15)', color: 'var(--green)',
                border: '1px solid rgba(52,211,153,0.35)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                LIVE
              </span>
            )}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', margin: '0 0 5px' }}>
            {raid.name}
          </h2>
          <p style={{ fontSize: 12, color: 'var(--muted2)', maxWidth: 400 }}>{raid.desc}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          {topPlayer && (
            <div style={{
              background: 'rgba(0,0,0,0.35)', border: `1px solid ${raid.color}30`,
              borderRadius: 10, padding: '7px 13px', textAlign: 'right',
            }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 3 }}>
                {(raid.status === 'CURRENT' || raid.status === 'current') ? 'CURRENT LEADER' : 'FINAL RANK 1'}
              </div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{topPlayer.name}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: raid.color, fontWeight: 700 }}>
                {topPlayer.score.toLocaleString()} pts
              </div>
            </div>
          )}
          <div style={{
            background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border)',
            borderRadius: 7, padding: '4px 10px', fontSize: 11, color: 'var(--muted)',
            fontFamily: 'var(--mono)',
          }}>
            {fmtDate(raid.startDate)} → {fmtDate(raid.endDate)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            {participantCount} participants (guild)
          </div>
        </div>
      </div>
    </div>
  )
}
