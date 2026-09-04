import assert from 'node:assert/strict'
import test from 'node:test'
import { calculatePlayerProfileStats, type PlayerStatEntry } from './player-profile-stats'

function entry(rank: number, participantCount: number, type: string, terrain: string, boss: string): PlayerStatEntry {
  return { rank, participantCount, raid: { type: { name: type }, terrain: { name: terrain }, raidBoss: { name: boss } } }
}

test('calculates recent form, consistency, achievements, and breakdowns', () => {
  const stats = calculatePlayerProfileStats([
    entry(8, 200, 'Total Assault', 'Urban', 'Binah'),
    entry(20, 100, 'Grand Assault', 'Outdoor', 'Hod'),
    entry(3, 160, 'Total Assault', 'Urban', 'Binah'),
    entry(12, 120, 'Grand Assault', 'Indoor', 'Hod'),
    entry(6, 150, 'Total Assault', 'Urban', 'Binah'),
    entry(40, 200, 'Grand Assault', 'Outdoor', 'Hod'),
  ])

  assert.deepEqual(stats, {
    latestRank: 8,
    latestPercentile: 4,
    rankChange: 12,
    lastFiveAverageRank: 10,
    medianRank: 10,
    worstRank: 40,
    podiumRate: 17,
    top10Rate: 50,
    top50Rate: 100,
    bestRaidType: { name: 'Total Assault', averageRank: 6, entries: 3 },
    bestTerrain: { name: 'Urban', averageRank: 6, entries: 3 },
    bestBoss: { name: 'Binah', averageRank: 6, entries: 3 },
  })
})

test('returns empty-safe values and ignores unranked entries', () => {
  const stats = calculatePlayerProfileStats([entry(0, 100, 'Total Assault', 'Urban', 'Binah')])

  assert.equal(stats.latestRank, null)
  assert.equal(stats.medianRank, null)
  assert.equal(stats.podiumRate, 0)
  assert.equal(stats.top10Rate, 0)
  assert.equal(stats.top50Rate, 0)
  assert.equal(stats.bestBoss, null)
})
