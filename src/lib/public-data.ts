import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getActiveRaidIds, withRaidActivity } from '@/lib/raid-activity'
import { getRankedRaidEntries } from '@/lib/raid-entries'
import { getBirthdayDay, getDaysUntilBirthday } from '@/lib/birthdays'
import { PUBLIC_CACHE_TAGS, PUBLIC_DATA_REVALIDATE_SECONDS } from '@/lib/cache'
import { dateKeyFromDate } from '@/lib/recruitments'

const raidInclude = {
  raidBoss: true,
  type: true,
  server: true,
  terrain: true,
} as const

export function clubName(club?: string | null) {
  const trimmed = club?.trim()
  return trimmed || 'Guest'
}

export function isGuestClub(club: string) {
  return club.toLowerCase() === 'guest'
}

function playerClubName(player: { clubData?: { name: string } | null; club?: string | null }) {
  return player.clubData?.name || clubName(player.club)
}

function playerClubId(player: { clubId?: string | null; clubData?: { id: string } | null }) {
  return player.clubId || player.clubData?.id || null
}

function baseStudentName(name: string) {
  return name
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .replace(/\s*[\-*]\s*[^-*()]+$/g, '')
    .trim()
    .toLowerCase()
}

export function isStudentVariant(name: string) {
  return baseStudentName(name) !== name.trim().toLowerCase()
}

function uniqueStudentsByExactName<T extends { id: number; name: string }>(students: T[]) {
  const rows = new Map<string, T>()
  students.forEach((student) => {
    const key = student.name.trim().toLowerCase()
    const existing = rows.get(key)
    if (!existing || student.id < existing.id) rows.set(key, student)
  })
  return Array.from(rows.values())
}

function avg(total: number, count: number) {
  return count > 0 ? Math.round(total / count) : 0
}

function compareDateDesc(a?: Date | string | null, b?: Date | string | null) {
  const aTime = a ? new Date(a).getTime() : 0
  const bTime = b ? new Date(b).getTime() : 0
  return bTime - aTime
}

function rankLookup(entries: Array<{ raidId: string; playerId: string; score: number }>) {
  const byRaid = new Map<string, Array<{ raidId: string; playerId: string; score: number }>>()
  entries.forEach((entry) => {
    const rows = byRaid.get(entry.raidId) || []
    rows.push(entry)
    byRaid.set(entry.raidId, rows)
  })

  const ranks = new Map<string, number>()
  byRaid.forEach((rows) => {
    rows
      .sort((a, b) => b.score - a.score)
      .forEach((entry, index) => {
        ranks.set(`${entry.raidId}:${entry.playerId}`, index + 1)
      })
  })
  return ranks
}

function bestRankFrom(ranks: number[]) {
  const realRanks = ranks.filter((rank) => rank > 0)
  return realRanks.length ? Math.min(...realRanks) : null
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

export const getPublicStudents = unstable_cache(
  () => prisma.student.findMany({ orderBy: { name: 'asc' } }),
  ['public-students'],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.students],
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

export const getPublicChatPlayers = unstable_cache(
  () => prisma.player.findMany({
    orderBy: { ign: 'asc' },
    select: {
      id: true,
      ign: true,
      username: true,
      favouriteStudent: true,
      favouriteStudentId: true,
      favouriteStudentData: {
        select: {
          id: true,
          name: true,
        },
      },
      club: true,
      clubID: true,
      clubId: true,
      clubData: {
        select: {
          id: true,
          name: true,
          uid: true,
          color: true,
        },
      },
      userID: true,
      isGuildMember: true,
      joinedDate: true,
    },
  }),
  ['public-chat-players'],
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
  async (birthdayKey: string) => {
    const students = await prisma.student.findMany({
      where: { birthDay: birthdayKey },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
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
    })

    return uniqueStudentsByExactName(students)
  },
  ['public-birthday-students-v2'],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.birthdays, PUBLIC_CACHE_TAGS.students],
  }
)

export const getPublicUpcomingBirthdayStudents = unstable_cache(
  async (_birthdayKey: string, take?: number, maxDays = 60) => {
    const students = await prisma.student.findMany({
      where: { birthDay: { not: null } },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
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
    })

    const upcoming = uniqueStudentsByExactName(students)
      .map((student) => ({ ...student, daysUntilBirthday: getDaysUntilBirthday(student.birthDay) }))
      .filter((student): student is typeof student & { daysUntilBirthday: number } => (
        student.daysUntilBirthday !== null &&
        student.daysUntilBirthday > 0 &&
        student.daysUntilBirthday <= maxDays &&
        !isStudentVariant(student.name)
      ))
      .sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday || a.name.localeCompare(b.name))

    const uniqueStudents = new Map<string, (typeof upcoming)[number]>()
    upcoming.forEach((student) => {
      const baseName = baseStudentName(student.name)
      const existing = uniqueStudents.get(baseName)
      if (!existing) {
        uniqueStudents.set(baseName, student)
        return
      }

      if (isStudentVariant(existing.name) && !isStudentVariant(student.name)) {
        uniqueStudents.set(baseName, student)
      }
    })

    const rows = Array.from(uniqueStudents.values())
    return take ? rows.slice(0, take) : rows
  },
  ['public-upcoming-birthday-students-v2'],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.birthdays, PUBLIC_CACHE_TAGS.students],
  }
)

export const getPublicFutureRecruitment = unstable_cache(
  async (todayKey = dateKeyFromDate()) => {
    const schedule = await prisma.upcomingRecruitment.findFirst({
      where: { dateKey: { gt: todayKey } },
      orderBy: { dateKey: 'asc' },
      include: {
        items: {
          orderBy: { position: 'asc' },
          include: {
            recruitment: {
              include: {
                student: {
                  select: {
                    id: true,
                    name: true,
                    characterVoice: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!schedule || schedule.items.length === 0) return null

    return {
      id: schedule.id,
      dateKey: schedule.dateKey,
      recruitments: schedule.items.map(({ recruitment }) => ({
        id: recruitment.id,
        bannerPath: recruitment.bannerPath,
        animationPath: recruitment.animationPath,
        student: recruitment.student,
      })),
    }
  },
  ['public-future-recruitment'],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.recruitments, PUBLIC_CACHE_TAGS.students],
  }
)

export const getPublicRecruitmentCalendar = unstable_cache(
  async (todayKey = dateKeyFromDate()) => {
    const schedules = await prisma.upcomingRecruitment.findMany({
      where: { dateKey: { gte: todayKey } },
      orderBy: { dateKey: 'asc' },
      include: {
        items: {
          orderBy: { position: 'asc' },
          include: {
            recruitment: {
              include: {
                student: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                    portrait: true,
                    familyName: true,
                    personalName: true,
                    school: true,
                    club: true,
                    schoolYear: true,
                    characterAge: true,
                    characterVoice: true,
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
                },
              },
            },
          },
        },
      },
    })

    return schedules
      .filter((schedule) => schedule.items.length > 0)
      .map((schedule) => ({
        id: schedule.id,
        dateKey: schedule.dateKey,
        recruitments: schedule.items.map(({ recruitment }) => ({
          id: recruitment.id,
          bannerPath: recruitment.bannerPath,
          animationPath: recruitment.animationPath,
          student: recruitment.student,
        })),
      }))
  },
  ['public-recruitment-calendar'],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.recruitments, PUBLIC_CACHE_TAGS.students],
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
    })).sort((a, b) => compareDateDesc(a.raid.startDate, b.raid.startDate) || b.score - a.score)

    const totalScore = entriesWithRank.reduce((sum, entry) => sum + entry.score, 0)
    const podiums = entriesWithRank.filter((entry) => entry.rank > 0 && entry.rank <= 3).length
    const rankOnes = entriesWithRank.filter((entry) => entry.rank === 1).length
    const top10s = entriesWithRank.filter((entry) => entry.rank > 0 && entry.rank <= 10).length
    const top50s = entriesWithRank.filter((entry) => entry.rank > 0 && entry.rank <= 50).length
    const playerRankedEntries = entriesWithRank.filter((entry) => entry.rank > 0)
    const latestEntry = entriesWithRank[0] || null
    const participatedServerIds = new Set(entriesWithRank.map((entry) => entry.raid.serverId).filter(Boolean))
    const relevantRaidCount = participatedServerIds.size > 0
      ? raids.filter((raid) => participatedServerIds.has(raid.serverId)).length
      : 0
    const bestScoreEntry = [...entriesWithRank].sort((a, b) => b.score - a.score)[0] || null

    return {
      ...player,
      entries: entriesWithRank,
      journey: {
        totalEntries: entriesWithRank.length,
        totalScore,
        averageScore: avg(totalScore, entriesWithRank.length),
        bestRank: bestRankFrom(entriesWithRank.map((entry) => entry.rank)),
        podiums,
        rankOnes,
        top10s,
        top50s,
        averageRank: avg(playerRankedEntries.reduce((sum, entry) => sum + entry.rank, 0), playerRankedEntries.length),
        bestScore: bestScoreEntry?.score || null,
        bestScoreRaid: bestScoreEntry ? `${bestScoreEntry.raid.raidBoss.name} S${bestScoreEntry.raid.season}` : null,
        participationRate: relevantRaidCount > 0 ? Math.round((entriesWithRank.length / relevantRaidCount) * 100) : 0,
        latestRank: latestEntry?.rank || null,
        latestRaid: latestEntry ? `${latestEntry.raid.raidBoss.name} S${latestEntry.raid.season}` : null,
      },
    }
  },
  ['public-player-profile'],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.players, PUBLIC_CACHE_TAGS.raidEntries],
  }
)

export const getPublicClubSummaries = unstable_cache(
  async () => {
    const [clubs, entries] = await Promise.all([
      prisma.club.findMany({
        include: { players: true },
        orderBy: { name: 'asc' },
      }),
      prisma.raidEntry.findMany({
        include: {
          player: { include: { clubData: true } },
          raid: { include: raidInclude },
        },
      }),
    ])

    const ranks = rankLookup(entries)

    return clubs
      .filter((club) => !isGuestClub(club.name))
      .map((club) => {
        const clubEntries = entries.filter((entry) => playerClubId(entry.player) === club.id)
        const totalScore = clubEntries.reduce((sum, entry) => sum + entry.score, 0)
        const rankedEntries = clubEntries.map((entry) => ({
          ...entry,
          rank: ranks.get(`${entry.raidId}:${entry.playerId}`) || 0,
        }))
        const bestEntry = [...rankedEntries]
          .filter((entry) => entry.rank > 0)
          .sort((a, b) => a.rank - b.rank || b.score - a.score)[0] || null
        const recentEntry = [...rankedEntries]
          .sort((a, b) => compareDateDesc(a.raid.startDate, b.raid.startDate))[0] || null

        return {
          id: club.id,
          name: club.name,
          uid: club.uid,
          logo: club.logo,
          color: club.color,
          totalScore,
          totalEntries: clubEntries.length,
          activePlayerCount: club.players.filter((player) => player.isGuildMember).length,
          rosterCount: club.players.length,
          averageScore: avg(totalScore, clubEntries.length),
          bestRank: bestEntry?.rank || null,
          bestRaid: bestEntry ? `${bestEntry.raid.raidBoss.name} S${bestEntry.raid.season}` : null,
          podiums: rankedEntries.filter((entry) => entry.rank > 0 && entry.rank <= 3).length,
          recentRaid: recentEntry ? `${recentEntry.raid.raidBoss.name} S${recentEntry.raid.season}` : null,
        }
      })
      .sort((a, b) => b.totalScore - a.totalScore || b.totalEntries - a.totalEntries || a.name.localeCompare(b.name))
      .map((club, index) => ({ ...club, rank: index + 1 }))
  },
  ['public-club-summaries'],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.clubs, PUBLIC_CACHE_TAGS.players, PUBLIC_CACHE_TAGS.raidEntries],
  }
)

export const getPublicClubProfile = unstable_cache(
  async (id: string) => {
    const club = await prisma.club.findUnique({
      where: { id },
      include: {
        players: {
          include: {
            favouriteStudentData: true,
            entries: { include: { raid: { include: raidInclude } } },
          },
          orderBy: { ign: 'asc' },
        },
      },
    })
    if (!club || isGuestClub(club.name)) return null

    const raidIds = Array.from(new Set(club.players.flatMap((player) => player.entries.map((entry) => entry.raidId))))
    const rankedSource = raidIds.length
      ? await prisma.raidEntry.findMany({
        where: { raidId: { in: raidIds } },
        select: { raidId: true, playerId: true, score: true },
      })
      : []
    const ranks = rankLookup(rankedSource)

    const roster = club.players.map((player) => {
      const entries = player.entries
        .map((entry) => ({
          ...entry,
          rank: ranks.get(`${entry.raidId}:${player.id}`) || 0,
        }))
        .sort((a, b) => compareDateDesc(a.raid.startDate, b.raid.startDate) || b.score - a.score)
      const totalScore = entries.reduce((sum, entry) => sum + entry.score, 0)

      return {
        id: player.id,
        ign: player.ign,
        username: player.username,
        userID: player.userID,
        isGuildMember: player.isGuildMember,
        favouriteStudent: player.favouriteStudentData?.name || player.favouriteStudent,
        favouriteStudentImage: player.favouriteStudentData?.image || null,
        totalScore,
        totalEntries: entries.length,
        averageScore: avg(totalScore, entries.length),
        bestRank: bestRankFrom(entries.map((entry) => entry.rank)),
        podiums: entries.filter((entry) => entry.rank > 0 && entry.rank <= 3).length,
        latestEntry: entries[0]
          ? {
            raidId: entries[0].raidId,
            raidName: `${entries[0].raid.raidBoss.name} S${entries[0].raid.season}`,
            terrain: entries[0].raid.terrain.name,
            server: entries[0].raid.server.name,
            rank: entries[0].rank,
            score: entries[0].score,
          }
          : null,
      }
    })

    const allEntries = roster.flatMap((player) => club.players
      .find((row) => row.id === player.id)?.entries
      .map((entry) => ({
        ...entry,
        playerId: player.id,
        playerName: player.ign,
        rank: ranks.get(`${entry.raidId}:${player.id}`) || 0,
      })) || [])
    const totalScore = roster.reduce((sum, player) => sum + player.totalScore, 0)
    const bestEntry = [...allEntries]
      .filter((entry) => entry.rank > 0)
      .sort((a, b) => a.rank - b.rank || b.score - a.score)[0] || null

    return {
      id: club.id,
      name: club.name,
      uid: club.uid,
      logo: club.logo,
      color: club.color,
      roster,
      stats: {
        totalScore,
        totalEntries: roster.reduce((sum, player) => sum + player.totalEntries, 0),
        activePlayerCount: roster.filter((player) => player.isGuildMember).length,
        averageScore: avg(totalScore, roster.reduce((sum, player) => sum + player.totalEntries, 0)),
        bestRank: bestEntry?.rank || null,
        bestRaid: bestEntry ? `${bestEntry.raid.raidBoss.name} S${bestEntry.raid.season}` : null,
        podiums: roster.reduce((sum, player) => sum + player.podiums, 0),
      },
    }
  },
  ['public-club-profile'],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.clubs, PUBLIC_CACHE_TAGS.players, PUBLIC_CACHE_TAGS.raidEntries],
  }
)

export const getPublicCommunityHub = unstable_cache(
  async () => {
    const [clubSummaries, publicPlayers, stats] = await Promise.all([
      getPublicClubSummaries(),
      prisma.player.findMany({
        orderBy: { ign: 'asc' },
        select: {
          id: true,
          ign: true,
          username: true,
          isGuildMember: true,
          favouriteStudent: true,
          favouriteStudentData: true,
          club: true,
          clubId: true,
          clubData: true,
        },
      }),
      getPublicStats(),
    ])
    const playerStats = new Map(stats.topPlayers.map((player) => [player.playerId, player]))

    return {
      topClubs: clubSummaries.slice(0, 24),
      featuredPlayers: stats.topPlayers.slice(0, clubSummaries.length),
      players: publicPlayers.map((player) => {
        const statsRow = playerStats.get(player.id)
        return {
          rank: statsRow?.rank || null,
          playerId: player.id,
          name: player.ign,
          username: player.username,
          isGuildMember: player.isGuildMember,
          club: playerClubName(player),
          clubId: playerClubId(player),
          favouriteStudent: player.favouriteStudentData?.name || player.favouriteStudent,
          favouriteStudentImage: player.favouriteStudentData?.image || null,
          totalScore: statsRow?.totalScore || 0,
          entryCount: statsRow?.entryCount || 0,
          averageScore: statsRow?.averageScore || 0,
          bestRank: statsRow?.bestRank || null,
          podiums: statsRow?.podiums || 0,
        }
      }),
    }
  },
  ['public-community-hub-v5'],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.community, PUBLIC_CACHE_TAGS.raids, PUBLIC_CACHE_TAGS.clubs, PUBLIC_CACHE_TAGS.players, PUBLIC_CACHE_TAGS.raidEntries],
  }
)

export const getPublicStats = unstable_cache(
  async () => {
    const [players, raids, entries] = await Promise.all([
      prisma.player.findMany(),
      prisma.raid.findMany({ include: raidInclude, orderBy: [{ startDate: 'desc' }, { season: 'desc' }] }),
      prisma.raidEntry.findMany({
        include: { player: { include: { clubData: true } }, raid: { include: raidInclude } },
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
      clubId: string | null
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
        clubId: player.clubId,
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
          club: playerClubName(entry.player),
          clubId: playerClubId(entry.player),
          totalScore: 0,
          entryCount: 0,
          bestRank: null,
          podiums: 0,
        }
        current.totalScore += entry.score
        current.entryCount += 1
        if (entry.rank > 0) current.bestRank = current.bestRank === null ? entry.rank : Math.min(current.bestRank, entry.rank)
        if (entry.rank > 0 && entry.rank <= 3) current.podiums += 1
        playerStats.set(entry.player.id, current)
      })
    })

    const topPlayers = Array.from(playerStats.values())
      .filter((player) => player.entryCount > 0)
      .sort((a, b) => b.totalScore - a.totalScore || b.entryCount - a.entryCount || a.name.localeCompare(b.name))
      .map((player, index) => ({
        rank: index + 1,
        playerId: player.playerId,
        name: player.name,
        club: player.club,
        clubId: player.clubId,
        totalScore: player.totalScore,
        entryCount: player.entryCount,
        averageScore: avg(player.totalScore, player.entryCount),
        bestRank: player.bestRank,
        podiums: player.podiums,
      }))

    const clubStats = new Map<string, {
      id: string | null
      name: string
      totalScore: number
      entryCount: number
      playerIds: Set<string>
    }>()

    entries.forEach((entry) => {
      const club = playerClubName(entry.player)
      const clubId = playerClubId(entry.player)
      const key = clubId || club
      const current = clubStats.get(key) || {
        id: clubId,
        name: club,
        totalScore: 0,
        entryCount: 0,
        playerIds: new Set<string>(),
      }
      current.totalScore += entry.score
      current.entryCount += 1
      current.playerIds.add(entry.player.id)
      clubStats.set(key, current)
    })

    players.forEach((player) => {
      const club = clubName(player.club)
      const key = player.clubId || club
      const current = clubStats.get(key) || {
        id: player.clubId,
        name: club,
        totalScore: 0,
        entryCount: 0,
        playerIds: new Set<string>(),
      }
      current.playerIds.add(player.id)
      clubStats.set(key, current)
    })

    const clubStandings = Array.from(clubStats.values())
      .filter((club) => !isGuestClub(club.name))
      .sort((a, b) => b.totalScore - a.totalScore || b.entryCount - a.entryCount || a.name.localeCompare(b.name))
      .map((club, index) => ({
        rank: index + 1,
        id: club.id,
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
  ['public-stats-v3'],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.stats, PUBLIC_CACHE_TAGS.raids, PUBLIC_CACHE_TAGS.raidEntries, PUBLIC_CACHE_TAGS.players],
  }
)

export function getCurrentBirthdayDay() {
  return getBirthdayDay()
}
