import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const raidInclude = { raidBoss: true, type: true, server: true } as const

export async function GET() {
  const [players, raids, entries] = await Promise.all([
    prisma.player.findMany({ include: { entries: { include: { raid: { include: raidInclude } } } } }),
    prisma.raid.findMany({ include: raidInclude }),
    prisma.raidEntry.findMany({
      include: { player: true, raid: { include: raidInclude } },
      orderBy: { score: 'desc' },
    }),
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
    .filter((e) => e.raid.server.name === 'Global')
    .forEach((e) => {
      const club = e.player.club
      if (club) globalClubSubs[club] = (globalClubSubs[club] || 0) + 1
    })
  const topSubmitEntry = Object.entries(globalClubSubs).sort((a, b) => b[1] - a[1])[0]

  const activePlayers = players.length

  // Rank 1 Global (current)
  const curGlobal = raids.find((r) => r.status === 'CURRENT' && r.server.name === 'Global')
  const curJP     = raids.find((r) => r.status === 'CURRENT' && r.server.name === 'Japan')

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

  return NextResponse.json({
    topClub: { name: topClubEntry?.[0] ?? '—', count: topClubEntry?.[1] ?? 0 },
    topSubmitClub: { name: topSubmitEntry?.[0] ?? '—', count: topSubmitEntry?.[1] ?? 0 },
    activePlayers,
    rank1Global: r1Global
      ? { name: r1Global.player.ign, playerId: r1Global.player.id, raid: `${curGlobal?.raidBoss.name} S${curGlobal?.season}` }
      : null,
    rank1JP: r1JP
      ? { name: r1JP.player.ign, playerId: r1JP.player.id, raid: `${curJP?.raidBoss.name} S${curJP?.season}` }
      : null,
    topByScore,
    clubDist,
  })
}
