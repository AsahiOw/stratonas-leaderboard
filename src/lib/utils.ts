export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d + (d.includes('T') ? '' : 'T00:00:00')) : d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function hexToRgb(hex: string): string {
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`
}

export const FAKE_NAMES = [
  'DarkSerpent','IceWraith','FlameKnight','ThunderClaw','SilverMist',
  'GhostBlade','StoneFist','WindRider','ChaosEdge','LunarHawk',
  'RiftWalker','StarPiercer','BoneCrusher','SoulReaper','NeonPhantom',
  'DawnBreaker','TwilightEdge','MidnightRush','CrimsonDawn','VoidChild',
  'IronClad','SwiftArrow','DeepEcho','SkyShatter','EarthBreaker',
  'TideRider','MoonShard','SunForge','AstralBolt','NightCrawler',
  'StormFist','RavenClaw','SerpentTail','DragonFang','PhoenixAsh',
  'CrystalGuard','ShadowStep','BloodMoon','FrostBite','LavaFlow',
  'QuickSilver','DarkMatter','GoldRush','IcePeak','FireStorm',
]

export interface RankedEntry {
  rank: number
  name: string
  score: number
  w: number
  l: number
  streak: number
  isGuild: boolean
  favouriteStudent?: string
}

export function generateFullRanking(guildEntries: RankedEntry[]): RankedEntry[] {
  if (!guildEntries.length) return []
  const guildSet = new Set(guildEntries.map((e) => e.name))
  const avail = FAKE_NAMES.filter((n) => !guildSet.has(n))
  const base = guildEntries[guildEntries.length - 1].score
  const fake: RankedEntry[] = []
  for (let i = guildEntries.length; i < 50; i++) {
    const j = i - guildEntries.length
    fake.push({
      rank: i + 1,
      name: avail[j % avail.length],
      score: Math.max(50, base - (j + 1) * 150 - (j % 7) * 35),
      w: Math.max(1, 10 - Math.floor(j * 0.25)),
      l: 4 + Math.floor(j * 0.6),
      streak: 0,
      isGuild: false,
    })
  }
  return [...guildEntries, ...fake]
}
