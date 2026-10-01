import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import snapshotData from './chibi-acceptance-roster.snapshot.json'

/**
 * Chibi acceptance deliberately has two roster modes. The one-row pilot is a
 * repository-owned smoke fixture; catalog-scale acceptance reads only the
 * committed, source-derived snapshot below and never fetches a live catalog.
 */
export const CHIBI_ELIGIBLE_STUDENT_ID_MIN = 10000
export const CHIBI_ELIGIBLE_STUDENT_ID_MAX = 99999
export const ACCEPTANCE_ROSTER_SNAPSHOT_PATH = 'scripts/chibi-acceptance-roster.snapshot.json'
export const ACCEPTANCE_ROSTER_SOURCE_URL = 'https://schaledb.com/data/en/students.min.json'
export const ACCEPTANCE_ROSTER_SOURCE_FILE = 'src/lib/student-import.ts'
export const ACCEPTANCE_ROSTER_SNAPSHOT_VERSION = 1

export type AcceptanceRosterMode = 'pilot' | 'full'

export type AcceptanceStudent = {
  id: number
  name: string
  pathName: string | null
  devName: string | null
  image: string
  portrait: string
}

type AcceptanceSnapshotStudent = {
  id: number
  name: string
  pathName: string | null
  devName: string | null
}

type AcceptanceRosterSnapshot = {
  version: number
  source: {
    file: string
    url: string
    capturedAt: string
    sha256: string
    normalization: string
  }
  comparison: {
    mappedRosterBaselineCount: number
    eligibleMinusMappedRoster: number
    note: string
  }
  eligibleCount: number
  snapshotChecksum: string
  students: readonly AcceptanceSnapshotStudent[]
}

export const ACCEPTANCE_PILOT_STUDENTS = [
  {
    id: 10002,
    name: 'Haruna',
    pathName: 'haruna',
    devName: 'Haruna',
    image: '/assets/icons/icon.webp',
    portrait: '/assets/icons/icon.webp',
  },
] as const satisfies readonly AcceptanceStudent[]

export const ACCEPTANCE_PILOT_ROSTER_VERSION = 1
export const ACCEPTANCE_PILOT_ROSTER_CHECKSUM = createHash('sha256')
  .update(JSON.stringify(ACCEPTANCE_PILOT_STUDENTS))
  .digest('hex')

function snapshotRowsChecksum(rows: readonly AcceptanceSnapshotStudent[]) {
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex')
}

function assertOptionalText(value: unknown, name: string) {
  assert.ok(value === null || (typeof value === 'string' && value.trim()), `${name} must be null or a non-empty string.`)
}

function validateSnapshot(value: unknown): AcceptanceRosterSnapshot {
  assert.ok(typeof value === 'object' && value !== null && !Array.isArray(value), 'Acceptance roster snapshot must be a JSON object.')
  const snapshot = value as AcceptanceRosterSnapshot
  assert.equal(snapshot.version, ACCEPTANCE_ROSTER_SNAPSHOT_VERSION, 'Unsupported acceptance roster snapshot version.')
  assert.equal(snapshot.source.file, ACCEPTANCE_ROSTER_SOURCE_FILE, 'Acceptance roster snapshot source file does not match the importer.')
  assert.equal(snapshot.source.url, ACCEPTANCE_ROSTER_SOURCE_URL, 'Acceptance roster snapshot source URL does not match the importer.')
  assert.match(snapshot.source.capturedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/, 'Acceptance roster snapshot capture time must be an ISO UTC timestamp.')
  assert.ok(Number.isFinite(Date.parse(snapshot.source.capturedAt)), 'Acceptance roster snapshot capture time is invalid.')
  assert.match(snapshot.source.sha256, /^[a-f0-9]{64}$/i, 'Acceptance roster source sha256 must be a SHA-256 hex digest.')
  assert.ok(typeof snapshot.source.normalization === 'string' && snapshot.source.normalization.trim(), 'Acceptance roster snapshot normalization is required.')
  assert.ok(Array.isArray(snapshot.students), 'Acceptance roster snapshot students must be an array.')
  assert.equal(snapshot.eligibleCount, snapshot.students.length, 'Acceptance roster eligibleCount must equal the number of snapshot rows.')
  assert.equal(snapshot.comparison.eligibleMinusMappedRoster, snapshot.eligibleCount - snapshot.comparison.mappedRosterBaselineCount, 'Acceptance roster mapped-roster delta is inconsistent with eligibleCount.')
  assert.ok(typeof snapshot.comparison.note === 'string' && snapshot.comparison.note.trim(), 'Acceptance roster comparison note is required.')

  let previousId = 0
  const ids = snapshot.students.map((student, index) => {
    assert.deepEqual(Object.keys(student).sort(), ['devName', 'id', 'name', 'pathName'], `Acceptance roster row ${index} contains fields outside the seed fixture.`)
    assert.ok(Number.isInteger(student.id) && student.id >= CHIBI_ELIGIBLE_STUDENT_ID_MIN && student.id <= CHIBI_ELIGIBLE_STUDENT_ID_MAX, `Acceptance roster row ${index} has an ineligible Student.id.`)
    assert.ok(student.id > previousId, 'Acceptance roster rows must be unique and sorted by Student.id.')
    previousId = student.id
    assert.ok(typeof student.name === 'string' && student.name.trim(), `Acceptance roster row ${index} must have a non-empty Name.`)
    assertOptionalText(student.pathName, `Acceptance roster row ${index}.PathName`)
    assertOptionalText(student.devName, `Acceptance roster row ${index}.DevName`)
    return student.id
  })
  assert.equal(new Set(ids).size, ids.length, 'Acceptance roster Student.id values must be unique.')
  assert.equal(snapshot.snapshotChecksum, snapshotRowsChecksum(snapshot.students), 'Acceptance roster snapshot checksum does not match its normalized rows.')
  return snapshot
}

export const ACCEPTANCE_FULL_ROSTER_SNAPSHOT = validateSnapshot(snapshotData)
export const ACCEPTANCE_FULL_ROSTER_SNAPSHOT_CHECKSUM = ACCEPTANCE_FULL_ROSTER_SNAPSHOT.snapshotChecksum

function materializeStudent(student: AcceptanceSnapshotStudent): AcceptanceStudent {
  return {
    ...student,
    image: `https://schaledb.com/images/student/collection/${student.id}.webp`,
    portrait: `https://schaledb.com/images/student/portrait/${student.id}.webp`,
  }
}

export type AcceptanceRosterPlan = {
  mode: AcceptanceRosterMode
  version: number
  checksum: string
  source: string
  sourceUrl?: string
  eligibility: string
  students: readonly AcceptanceStudent[]
}

export function assertAcceptanceRosterMode(value: string | undefined): AcceptanceRosterMode {
  assert.ok(value && (value === 'pilot' || value === 'full'), '--roster is required and must be either pilot or full.')
  return value
}

export function acceptanceRosterPlan(mode: AcceptanceRosterMode): AcceptanceRosterPlan {
  if (mode === 'full') {
    return {
      mode,
      version: ACCEPTANCE_FULL_ROSTER_SNAPSHOT.version,
      checksum: ACCEPTANCE_FULL_ROSTER_SNAPSHOT_CHECKSUM,
      source: `repository-owned ${ACCEPTANCE_ROSTER_SNAPSHOT_PATH}`,
      sourceUrl: ACCEPTANCE_FULL_ROSTER_SNAPSHOT.source.url,
      eligibility: `Student.id in [${CHIBI_ELIGIBLE_STUDENT_ID_MIN}, ${CHIBI_ELIGIBLE_STUDENT_ID_MAX}] inclusive`,
      students: ACCEPTANCE_FULL_ROSTER_SNAPSHOT.students.map(materializeStudent),
    }
  }
  return {
    mode,
    version: ACCEPTANCE_PILOT_ROSTER_VERSION,
    checksum: ACCEPTANCE_PILOT_ROSTER_CHECKSUM,
    source: 'repository-owned Haruna pilot fixture in scripts/chibi-acceptance-roster.ts',
    eligibility: `Student.id in [${CHIBI_ELIGIBLE_STUDENT_ID_MIN}, ${CHIBI_ELIGIBLE_STUDENT_ID_MAX}] inclusive`,
    students: ACCEPTANCE_PILOT_STUDENTS,
  }
}

export function acceptanceRosterFromOptions(options: {
  flag?: string
  environment?: string
}): AcceptanceRosterPlan {
  const mode = assertAcceptanceRosterMode(options.flag || options.environment)
  return acceptanceRosterPlan(mode)
}
