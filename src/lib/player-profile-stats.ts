export type PlayerStatEntry = {
  rank: number
  participantCount: number
  raid: {
    type: { name: string }
    terrain: { name: string }
    raidBoss: { name: string }
  }
}

type Breakdown = {
  name: string
  averageRank: number
  entries: number
}

function average(values: number[]) {
  return values.length > 0 ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0
}

function bestBreakdown(entries: PlayerStatEntry[], nameFor: (entry: PlayerStatEntry) => string): Breakdown | null {
  const groups = new Map<string, number[]>()
  entries.forEach((entry) => {
    const name = nameFor(entry)
    groups.set(name, [...(groups.get(name) || []), entry.rank])
  })

  return Array.from(groups, ([name, ranks]) => ({ name, averageRank: average(ranks), entries: ranks.length }))
    .sort((a, b) => a.averageRank - b.averageRank || b.entries - a.entries || a.name.localeCompare(b.name))[0] || null
}

export function calculatePlayerProfileStats(entries: PlayerStatEntry[]) {
  const ranked = entries.filter((entry) => entry.rank > 0)
  const ranks = ranked.map((entry) => entry.rank).sort((a, b) => a - b)
  const middle = Math.floor(ranks.length / 2)
  const medianRank = ranks.length === 0
    ? null
    : ranks.length % 2 === 0
      ? Math.round((ranks[middle - 1] + ranks[middle]) / 2)
      : ranks[middle]
  const latest = ranked[0] || null
  const previous = ranked[1] || null

  return {
    latestRank: latest?.rank || null,
    latestPercentile: latest && latest.participantCount > 0
      ? Math.max(1, Math.min(100, Math.ceil((latest.rank / latest.participantCount) * 100)))
      : null,
    rankChange: latest && previous ? previous.rank - latest.rank : null,
    lastFiveAverageRank: ranked.length > 0 ? average(ranked.slice(0, 5).map((entry) => entry.rank)) : null,
    medianRank,
    worstRank: ranks.at(-1) || null,
    podiumRate: ranked.length > 0 ? Math.round((ranked.filter((entry) => entry.rank <= 3).length / ranked.length) * 100) : 0,
    top10Rate: ranked.length > 0 ? Math.round((ranked.filter((entry) => entry.rank <= 10).length / ranked.length) * 100) : 0,
    top50Rate: ranked.length > 0 ? Math.round((ranked.filter((entry) => entry.rank <= 50).length / ranked.length) * 100) : 0,
    bestRaidType: bestBreakdown(ranked, (entry) => entry.raid.type.name),
    bestTerrain: bestBreakdown(ranked, (entry) => entry.raid.terrain.name),
    bestBoss: bestBreakdown(ranked, (entry) => entry.raid.raidBoss.name),
  }
}
