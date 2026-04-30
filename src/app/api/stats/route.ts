import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [players, raids, entries] = await Promise.all([
    prisma.player.findMany({ include: { entries: { include: { raid: true } } } }),
    prisma.raid.findMany(),
    prisma.raidEntry.findMany({ include: { player: true, raid: true }, orderBy: { score: 'desc' } }),
  ])

  // Club participant count
  const clubCount: Record<string, number> = {}
  players.forEach((p) => {
    if (p.club) clubCount[p.club] = (clubCount[p.club] || 0) + 1
  })
  const topClubEntry = Object.entries(clubCount).sort((a, b) => b[1] - a[1])[0]

  // Top submitting club on Global raids
  const globalClubSubs: Record<string, number> = {}
  entries
    .filter((e) => e.raid.server === 'GLOBAL')
    .forEach((e) => {
      const club = e.player.club
      if (club) globalClubSubs[club] = (globalClubSubs[club] || 0) + 1
    })
  const topSubmitEntry = Object.entries(globalClubSubs).sort((a, b) => b[1] - a[1])[0]

  // Active players
  const activePlayers = players.filter((p) => p.status === 'ACTIVE').length

  // Rank 1 Global (current)
  const curGlobal = raids.find((r) => r.status === 'CURRENT' && r.server === 'GLOBAL')
  const curJP = raids.find((r) => r.status === 'CURRENT' && r.server === 'JP')

  const r1Global = curGlobal
    ? entries.filter((e) => e.raidId === curGlobal.id).sort((a, b) => b.score - a.score)[0]
    : null
  const r1JP = curJP
    ? entries.filter((e) => e.raidId === curJP.id).sort((a, b) => b.score - a.score)[0]
    : null

  // Total score by player (top 8)
  const totalScore: Record<string, number> = {}
  entries.forEach((e) => {
    totalScore[e.player.ign] = (totalScore[e.player.ign] || 0) + e.score
  })
  const topByScore = Object.entries(totalScore)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, val]) => ({ name, val }))

  // Club distribution
  const clubDist = Object.entries(clubCount)
    .sort((a, b) => b[1] - a[1])
    .map(([name, val]) => ({ name, val }))

  // Live streaks (top 5, streak > 0)
  const liveStreaks = entries
    .filter((e) => e.streak > 0 && e.raid.status === 'CURRENT')
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 5)
    .map((e) => ({
      name: e.player.ign,
      playerId: e.player.id,
      streak: e.streak,
      raid: `${e.raid.name} ${e.raid.episode ?? ''}`.trim(),
      server: e.raid.server,
    }))

  return NextResponse.json({
    topClub: { name: topClubEntry?.[0] ?? '—', count: topClubEntry?.[1] ?? 0 },
    topSubmitClub: { name: topSubmitEntry?.[0] ?? '—', count: topSubmitEntry?.[1] ?? 0 },
    activePlayers,
    rank1Global: r1Global ? { name: r1Global.player.ign, playerId: r1Global.player.id, raid: `${curGlobal?.name} ${curGlobal?.episode ?? ''}`.trim() } : null,
    rank1JP: r1JP ? { name: r1JP.player.ign, playerId: r1JP.player.id, raid: `${curJP?.name} ${curJP?.episode ?? ''}`.trim() } : null,
    topByScore,
    clubDist,
    liveStreaks,
  })
}
