import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getActiveRaidIds, withRaidActivity } from '@/lib/raid-activity'
import { getRankedRaidEntries } from '@/lib/raid-entries'
import { getBirthdayDay } from '@/lib/birthdays'
import { PUBLIC_CACHE_TAGS, PUBLIC_DATA_REVALIDATE_SECONDS } from '@/lib/cache'

const raidInclude = {
  raidBoss: true,
  type: true,
  server: true,
  terrain: true,
} as const

function clubName(club?: string | null) {
  const trimmed = club?.trim()
  return trimmed || 'Guest'
}

function isGuestClub(club: string) {
  return club.toLowerCase() === 'guest'
}

function avg(total: number, count: number) {
  return count > 0 ? Math.round(total / count) : 0
}

export const getPublicRaids = unstable_cache(
  async () => {
    const raids = await prisma.raid.findMany({
      include: raidInclude,
      orderBy: [{ startDate: 'desc' }, { season: 'desc' }],
    })
    return withRaidActivity(raids)
  },
  ['public-raids'],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.raids],
  }
)

export const getPublicRaid = unstable_cache(
  (id: string) => prisma.raid.findUnique({
    where: { id },
    include: raidInclude,
  }),
  ['public-raid'],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.raids],
  }
)

export const getPublicRaidBosses = unstable_cache(
  () => prisma.raidBoss.findMany({ orderBy: { name: 'asc' } }),
  ['public-raid-bosses'],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.raidBosses],
  }
)

export const getPublicPlayers = unstable_cache(
  () => prisma.player.findMany({
    where: { isGuildMember: true },
    orderBy: { ign: 'asc' },
    select: {
      id: true,
      ign: true,
      username: true,
      favouriteStudent: true,
      favouriteStudentId: true,
      favouriteStudentData: true,
      club: true,
      clubID: true,
      clubId: true,
      clubData: true,
      userID: true,
      joinedDate: true,
    },
  }),
  ['public-players'],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.players],
  }
)

export const getPublicRaidEntries = unstable_cache(
  (raidId: string, take?: number, guildOnly = false) => getRankedRaidEntries(raidId, take, { guildOnly }),
  ['public-raid-entries'],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.raidEntries],
  }
)

export const getPublicBirthdayStudents = unstable_cache(
  (birthdayKey: string) => prisma.student.findMany({
    where: { birthDay: birthdayKey },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      image: true,
      memorial: true,
      familyName: true,
      personalName: true,
      school: true,
      club: true,
      schoolYear: true,
      characterAge: true,
      birthday: true,
      birthDay: true,
      hobby: true,
      heightMetric: true,
      weaponType: true,
      tacticRole: true,
      position: true,
      weaponName: true,
      accentColor: true,
    },
  }),
  ['public-birthday-students'],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.birthdays, PUBLIC_CACHE_TAGS.students],
  }
)

export const getPublicPlayerProfile = unstable_cache(
  async (id: string, ign?: string | null) => {
    const playerInclude = {
      include: {
        favouriteStudentData: true,
        clubData: true,
        entries: {
          include: { raid: { include: raidInclude } },
          orderBy: { score: 'desc' },
        },
      },
    } as const

    const player = ign
      ? await prisma.player.findFirst({ where: { ign }, ...playerInclude })
      : await prisma.player.findUnique({ where: { id }, ...playerInclude })

    if (!player) return null

    const raids = await prisma.raid.findMany({ select: { id: true, serverId: true, startDate: true, endDate: true } })
    const activeRaidIds = getActiveRaidIds(raids)
    const raidIds = Array.from(new Set(player.entries.map((entry) => entry.raidId)))
    const rankedEntries = await prisma.raidEntry.findMany({
      where: { raidId: { in: raidIds } },
      orderBy: [{ raidId: 'asc' }, { score: 'desc' }],
      select: { raidId: true, playerId: true },
    })
    const rankByRaidPlayer = new Map<string, number>()
    const seenByRaid = new Map<string, number>()
    rankedEntries.forEach((entry) => {
      const nextRank = (seenByRaid.get(entry.raidId) || 0) + 1
      seenByRaid.set(entry.raidId, nextRank)
      rankByRaidPlayer.set(`${entry.raidId}:${entry.playerId}`, nextRank)
    })

    const entriesWithRank = player.entries.map((entry) => ({
      ...entry,
      rank: rankByRaidPlayer.get(`${entry.raidId}:${player.id}`) || 0,
      raid: { ...entry.raid, isActive: activeRaidIds.has(entry.raidId) },
    }))

    return { ...player, entries: entriesWithRank }
  },
  ['public-player-profile'],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.players, PUBLIC_CACHE_TAGS.raidEntries],
  }
)

export const getPublicStats = unstable_cache(
  async () => {
    const [players, raids, entries] = await Promise.all([
      prisma.player.findMany(),
      prisma.raid.findMany({ include: raidInclude, orderBy: [{ startDate: 'desc' }, { season: 'desc' }] }),
      prisma.raidEntry.findMany({
        include: { player: true, raid: { include: raidInclude } },
        orderBy: { score: 'desc' },
      }),
    ])

    const raidsWithActivity = withRaidActivity(raids)
    const entriesByRaid = new Map<string, typeof entries>()
    entries.forEach((entry) => {
      const raidEntries = entriesByRaid.get(entry.raidId) || []
      raidEntries.push(entry)
      entriesByRaid.set(entry.raidId, raidEntries)
    })

    const rankedByRaid = new Map<string, Array<(typeof entries)[number] & { rank: number }>>()
    entriesByRaid.forEach((raidEntries, raidId) => {
      rankedByRaid.set(
        raidId,
        [...raidEntries]
          .sort((a, b) => b.score - a.score)
          .map((entry, index) => ({ ...entry, rank: index + 1 }))
      )
    })

    const playerStats = new Map<string, {
      playerId: string
      name: string
      club: string
      totalScore: number
      entryCount: number
      bestRank: number | null
      podiums: number
    }>()

    players.forEach((player) => {
      playerStats.set(player.id, {
        playerId: player.id,
        name: player.ign,
        club: clubName(player.club),
        totalScore: 0,
        entryCount: 0,
        bestRank: null,
        podiums: 0,
      })
    })

    rankedByRaid.forEach((raidEntries) => {
      raidEntries.forEach((entry) => {
        const current = playerStats.get(entry.player.id) || {
          playerId: entry.player.id,
          name: entry.player.ign,
          club: clubName(entry.player.club),
          totalScore: 0,
          entryCount: 0,
          bestRank: null,
          podiums: 0,
        }
        current.totalScore += entry.score
        current.entryCount += 1
        current.bestRank = current.bestRank === null ? entry.rank : Math.min(current.bestRank, entry.rank)
        if (entry.rank <= 3) current.podiums += 1
        playerStats.set(entry.player.id, current)
      })
    })

    const topPlayers = Array.from(playerStats.values())
      .filter((player) => player.entryCount > 0)
      .sort((a, b) => b.totalScore - a.totalScore || b.entryCount - a.entryCount || a.name.localeCompare(b.name))
      .slice(0, 12)
      .map((player, index) => ({
        rank: index + 1,
        playerId: player.playerId,
        name: player.name,
        club: player.club,
        totalScore: player.totalScore,
        entryCount: player.entryCount,
        averageScore: avg(player.totalScore, player.entryCount),
        bestRank: player.bestRank,
        podiums: player.podiums,
      }))

    const clubStats = new Map<string, {
      name: string
      totalScore: number
      entryCount: number
      playerIds: Set<string>
    }>()

    entries.forEach((entry) => {
      const club = clubName(entry.player.club)
      const current = clubStats.get(club) || {
        name: club,
        totalScore: 0,
        entryCount: 0,
        playerIds: new Set<string>(),
      }
      current.totalScore += entry.score
      current.entryCount += 1
      current.playerIds.add(entry.player.id)
      clubStats.set(club, current)
    })

    players.forEach((player) => {
      const club = clubName(player.club)
      const current = clubStats.get(club) || {
        name: club,
        totalScore: 0,
        entryCount: 0,
        playerIds: new Set<string>(),
      }
      current.playerIds.add(player.id)
      clubStats.set(club, current)
    })

    const clubStandings = Array.from(clubStats.values())
      .filter((club) => !isGuestClub(club.name))
      .sort((a, b) => b.totalScore - a.totalScore || b.entryCount - a.entryCount || a.name.localeCompare(b.name))
      .slice(0, 12)
      .map((club, index) => ({
        rank: index + 1,
        name: club.name,
        totalScore: club.totalScore,
        entryCount: club.entryCount,
        playerCount: club.playerIds.size,
        averageScore: avg(club.totalScore, club.entryCount),
      }))

    const raidBreakdown = raidsWithActivity.map((raid) => {
      const raidEntries = rankedByRaid.get(raid.id) || []
      const topEntry = raidEntries[0] || null
      const uniquePlayers = new Set(raidEntries.map((entry) => entry.player.id))
      const uniqueClubs = new Set(
        raidEntries
          .map((entry) => clubName(entry.player.club))
          .filter((club) => !isGuestClub(club))
      )
      const totalScore = raidEntries.reduce((sum, entry) => sum + entry.score, 0)

      return {
        id: raid.id,
        boss: raid.raidBoss.name,
        season: raid.season,
        type: raid.type.name,
        server: raid.server.name,
        terrain: raid.terrain.name,
        isActive: raid.isActive,
        color: raid.color,
        startDate: raid.startDate,
        endDate: raid.endDate,
        entryCount: raidEntries.length,
        uniquePlayers: uniquePlayers.size,
        uniqueClubs: uniqueClubs.size,
        averageScore: avg(totalScore, raidEntries.length),
        topPlayer: topEntry
          ? { name: topEntry.player.ign, playerId: topEntry.player.id, score: topEntry.score }
          : null,
      }
    })

    const currentRaidLeaders = raidBreakdown
      .filter((raid) => raid.isActive)
      .map((raid) => ({
        id: raid.id,
        boss: raid.boss,
        season: raid.season,
        type: raid.type,
        server: raid.server,
        terrain: raid.terrain,
        color: raid.color,
        entryCount: raid.entryCount,
        topPlayer: raid.topPlayer,
      }))

    const clubs = new Set(
      players
        .map((player) => clubName(player.club))
        .filter((club) => !isGuestClub(club))
    )
    const chartTopPlayers = topPlayers.slice(0, 8).map((player) => ({ name: player.name, val: player.totalScore }))
    const chartEntriesByRaid = raidBreakdown
      .filter((raid) => raid.entryCount > 0)
      .sort((a, b) => b.entryCount - a.entryCount)
      .slice(0, 8)
      .map((raid) => ({ name: `${raid.boss} S${raid.season}`, val: raid.entryCount }))
    const chartClubParticipation = clubStandings
      .filter((club) => club.entryCount > 0)
      .slice(0, 8)
      .map((club) => ({ name: club.name, val: club.entryCount }))

    return {
      snapshot: {
        totalPlayers: players.length,
        totalEntries: entries.length,
        latestRaids: raidBreakdown.filter((raid) => raid.isActive).length,
        completedRaids: raidBreakdown.filter((raid) => !raid.isActive).length,
        uniqueClubs: clubs.size,
        averageEntriesPerRaid: avg(entries.length, raids.length),
      },
      currentRaidLeaders,
      topPlayers,
      clubStandings,
      raidBreakdown,
      charts: {
        topPlayerScores: chartTopPlayers,
        entriesByRaid: chartEntriesByRaid,
        clubParticipation: chartClubParticipation,
      },
    }
  },
  ['public-stats'],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.stats, PUBLIC_CACHE_TAGS.raids, PUBLIC_CACHE_TAGS.raidEntries, PUBLIC_CACHE_TAGS.players],
  }
)

export function getCurrentBirthdayDay() {
  return getBirthdayDay()
}
