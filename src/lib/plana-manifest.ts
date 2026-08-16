export const PLANA_MANIFEST_SCHEMA_VERSION = 2

export type PlanaImportMode = 'new' | 'backfill'

export type PlanaManifestEntry = {
  region: string
  raidType: 'Total Assault' | 'Grand Assault'
  raidDate: string
  season: string
  label: string
  internalName: string
  terrain: string
  source: string
  maxDifficulty: string | null
  armors: string[] | null
  difficulties: string[] | null
  startAt: string | null
  endAt: string | null
  dbRemotePath: string
  parquetRemotePath: string
}

export type ParsedPlanaManifest = {
  schemaVersion: number
  entries: PlanaManifestEntry[]
}

type ExistingDataset = {
  region: string
  raidType: string
  raidDate: string
  dbRemotePath: string
  parquetRemotePath: string
  status: string
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function requiredString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Plana manifest field "${field}" must be a non-empty string.`)
  }
  return value.trim()
}

function optionalString(value: unknown, field: string) {
  if (value === undefined || value === null) return null
  return requiredString(value, field)
}

function stringArray(value: unknown, field: string) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Plana manifest field "${field}" must be a non-empty string array.`)
  }
  return value.map((item, index) => requiredString(item, `${field}[${index}]`))
}

export function validatePlanaRemotePath(
  value: unknown,
  region: string,
  extension: '.db' | '.parquet'
) {
  const remotePath = requiredString(value, extension === '.db' ? 'db' : 'unfiltered_runs')
  if (
    remotePath.startsWith('/')
    || remotePath.includes('\\')
    || remotePath.includes('?')
    || remotePath.includes('#')
  ) {
    throw new Error(`Unsafe Plana remote path: ${remotePath}`)
  }

  const parts = remotePath.split('/')
  if (
    parts.length < 2
    || parts.some((part) => !part || part === '.' || part === '..')
    || parts[0] !== region
    || !remotePath.endsWith(extension)
  ) {
    throw new Error(`Unexpected Plana remote path: ${remotePath}`)
  }

  return remotePath
}

export function parsePlanaManifest(input: unknown): ParsedPlanaManifest {
  const manifest = record(input)
  if (!manifest) throw new Error('Plana manifest must be an object.')

  const schemaVersion = Number(manifest.schema_version)
  if (schemaVersion !== PLANA_MANIFEST_SCHEMA_VERSION) {
    throw new Error(`Unsupported Plana manifest schema version: ${String(manifest.schema_version)}`)
  }

  const databases = record(manifest.databases)
  if (!databases) throw new Error('Plana manifest is missing "databases".')

  const entries: PlanaManifestEntry[] = []
  const keys = new Set<string>()

  for (const [region, rawEntries] of Object.entries(databases)) {
    if (!/^[A-Z]{2}$/.test(region) || !Array.isArray(rawEntries)) {
      throw new Error(`Invalid Plana database region: ${region}`)
    }

    for (const rawEntry of rawEntries) {
      const entry = record(rawEntry)
      if (!entry) throw new Error(`Invalid Plana database entry in region ${region}.`)

      const raidType = requiredString(entry.type, 'type')
      if (raidType !== 'Total Assault' && raidType !== 'Grand Assault') {
        throw new Error(`Unsupported Plana raid type: ${raidType}`)
      }

      const raidDate = requiredString(entry.date, 'date')
      if (!/^\d{8}$/.test(raidDate)) {
        throw new Error(`Invalid Plana raid date: ${raidDate}`)
      }

      const key = `${region}:${raidType}:${raidDate}`
      if (keys.has(key)) throw new Error(`Duplicate Plana database entry: ${key}`)
      keys.add(key)

      const armors = raidType === 'Grand Assault' ? stringArray(entry.armors, 'armors') : null
      const difficulties = raidType === 'Grand Assault'
        ? stringArray(entry.difficulty, 'difficulty')
        : null
      if (armors && difficulties && armors.length !== difficulties.length) {
        throw new Error(`Plana armor/difficulty length mismatch for ${key}.`)
      }

      entries.push({
        region,
        raidType,
        raidDate,
        season: requiredString(entry.season, 'season'),
        label: requiredString(entry.label, 'label'),
        internalName: requiredString(entry.internal, 'internal'),
        terrain: requiredString(entry.terrain, 'terrain'),
        source: requiredString(entry.source, 'source'),
        maxDifficulty: raidType === 'Total Assault'
          ? requiredString(entry.max_difficulty, 'max_difficulty')
          : null,
        armors,
        difficulties,
        startAt: optionalString(entry.start_at, 'start_at'),
        endAt: optionalString(entry.end_at, 'end_at'),
        dbRemotePath: validatePlanaRemotePath(entry.db, region, '.db'),
        parquetRemotePath: validatePlanaRemotePath(
          entry.unfiltered_runs,
          region,
          '.parquet'
        ),
      })
    }
  }

  return { schemaVersion, entries }
}

function datasetKey(dataset: { region: string; raidType: string; raidDate: string }) {
  return `${dataset.region}:${dataset.raidType}:${dataset.raidDate}`
}

export function selectPlanaImportCandidates(
  entries: PlanaManifestEntry[],
  existing: ExistingDataset[],
  _mode: PlanaImportMode
) {
  const existingByKey = new Map(existing.map((dataset) => [datasetKey(dataset), dataset]))

  const candidates = entries.filter((entry) => {
    const saved = existingByKey.get(datasetKey(entry))
    const unchangedReady = saved?.status === 'ready'
      && saved.dbRemotePath === entry.dbRemotePath
      && saved.parquetRemotePath === entry.parquetRemotePath
    return !unchangedReady
  })

  return {
    candidates: candidates.sort((a, b) => (
      a.raidDate.localeCompare(b.raidDate)
      || a.region.localeCompare(b.region)
      || a.raidType.localeCompare(b.raidType)
    )),
    skipped: entries.length - candidates.length,
  }
}
