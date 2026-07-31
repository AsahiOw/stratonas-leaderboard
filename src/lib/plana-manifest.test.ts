import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parsePlanaManifest,
  selectPlanaImportCandidates,
  validatePlanaRemotePath,
  type PlanaManifestEntry,
} from './plana-manifest'

function totalRaid(region: string, date: string, season: string): PlanaManifestEntry {
  return {
    region,
    raidType: 'Total Assault',
    raidDate: date,
    season,
    label: 'Slumpia: Goz',
    internalName: 'Goz_Outdoor',
    terrain: 'Outdoor',
    source: 'plana',
    maxDifficulty: 'Lunatic',
    armors: null,
    difficulties: null,
    startAt: null,
    endAt: null,
    dbRemotePath: `${region}/${date}.db`,
    parquetRemotePath: `${region}/${date}_unfiltered_runs.parquet`,
  }
}

test('parses Total and Grand Assault manifest entries', () => {
  const parsed = parsePlanaManifest({
    schema_version: 2,
    databases: {
      JP: [
        {
          label: 'Slumpia: Goz',
          internal: 'Goz_Outdoor',
          season: 'S87',
          date: '20260325',
          max_difficulty: 'Lunatic',
          terrain: 'Outdoor',
          type: 'Total Assault',
          source: 'plana',
          db: 'JP/20260325.db',
          unfiltered_runs: 'JP/20260325_unfiltered_runs.parquet',
        },
        {
          label: 'Decagrammaton: Hod',
          internal: 'HOD_Indoor',
          season: 'S35',
          date: '20260715',
          terrain: 'Indoor',
          armors: ['Light', 'Heavy', 'Elastic'],
          difficulty: ['Insane', 'Torment', 'Torment'],
          type: 'Grand Assault',
          source: 'plana',
          db: 'JP/20260715.db',
          unfiltered_runs: 'JP/20260715_unfiltered_runs.parquet',
        },
      ],
    },
  })

  assert.equal(parsed.schemaVersion, 2)
  assert.equal(parsed.entries.length, 2)
  assert.equal(parsed.entries[0].maxDifficulty, 'Lunatic')
  assert.deepEqual(parsed.entries[1].armors, ['Light', 'Heavy', 'Elastic'])
  assert.deepEqual(parsed.entries[1].difficulties, ['Insane', 'Torment', 'Torment'])
})

test('rejects unsupported schemas and unsafe file paths', () => {
  assert.throws(
    () => parsePlanaManifest({ schema_version: 3, databases: {} }),
    /Unsupported Plana manifest schema/
  )
  assert.throws(
    () => validatePlanaRemotePath('../secret.db', 'JP', '.db'),
    /Unexpected Plana remote path/
  )
  assert.throws(
    () => validatePlanaRemotePath('EU/20260325.db', 'JP', '.db'),
    /Unexpected Plana remote path/
  )
})

test('new mode imports every manifest entry not already stored', () => {
  const entries = [
    totalRaid('JP', '20260101', 'S85'),
    totalRaid('JP', '20260201', 'S86'),
    totalRaid('EU', '20260115', 'S78'),
  ]
  const selection = selectPlanaImportCandidates(entries, [], 'new')

  assert.deepEqual(
    selection.candidates.map((entry) => `${entry.region}:${entry.raidDate}`),
    ['JP:20260101', 'EU:20260115', 'JP:20260201']
  )
  assert.equal(selection.skipped, 0)
})

test('new mode imports missing history even when the newest dataset is ready', () => {
  const entries = [
    totalRaid('JP', '20260101', 'S85'),
    totalRaid('JP', '20260201', 'S86'),
    totalRaid('JP', '20260301', 'S87'),
  ]
  const existing = [{
    region: 'JP',
    raidType: 'Total Assault',
    raidDate: '20260301',
    dbRemotePath: 'JP/20260301.db',
    parquetRemotePath: 'JP/20260301_unfiltered_runs.parquet',
    status: 'ready',
  }]
  const selection = selectPlanaImportCandidates(entries, existing, 'new')

  assert.deepEqual(
    selection.candidates.map((entry) => entry.raidDate),
    ['20260101', '20260201']
  )
})

test('backfill mode imports missing history and retries failed datasets', () => {
  const entries = [
    totalRaid('JP', '20260101', 'S85'),
    totalRaid('JP', '20260201', 'S86'),
  ]
  const existing = [{
    region: 'JP',
    raidType: 'Total Assault',
    raidDate: '20260201',
    dbRemotePath: 'JP/20260201.db',
    parquetRemotePath: 'JP/20260201_unfiltered_runs.parquet',
    status: 'failed',
  }]
  const selection = selectPlanaImportCandidates(entries, existing, 'backfill')

  assert.deepEqual(
    selection.candidates.map((entry) => entry.raidDate),
    ['20260101', '20260201']
  )
})

test('new mode reimports a current dataset marked as changed', () => {
  const entry = totalRaid('JP', '20260301', 'S87')
  const selection = selectPlanaImportCandidates([entry], [{
    region: entry.region,
    raidType: entry.raidType,
    raidDate: entry.raidDate,
    dbRemotePath: entry.dbRemotePath,
    parquetRemotePath: entry.parquetRemotePath,
    status: 'changed',
  }], 'new')

  assert.deepEqual(selection.candidates.map((dataset) => dataset.raidDate), ['20260301'])
  assert.equal(selection.skipped, 0)
})
