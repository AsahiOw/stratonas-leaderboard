import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ACCEPTANCE_PILOT_ROSTER_CHECKSUM,
  ACCEPTANCE_PILOT_ROSTER_VERSION,
  ACCEPTANCE_PILOT_STUDENTS,
  ACCEPTANCE_FULL_ROSTER_SNAPSHOT,
  ACCEPTANCE_FULL_ROSTER_SNAPSHOT_CHECKSUM,
  ACCEPTANCE_ROSTER_SNAPSHOT_PATH,
  ACCEPTANCE_ROSTER_SNAPSHOT_VERSION,
  ACCEPTANCE_ROSTER_SOURCE_FILE,
  ACCEPTANCE_ROSTER_SOURCE_URL,
  CHIBI_ELIGIBLE_STUDENT_ID_MAX,
  CHIBI_ELIGIBLE_STUDENT_ID_MIN,
  acceptanceRosterFromOptions,
  acceptanceRosterPlan,
  assertAcceptanceRosterMode,
} from './chibi-acceptance-roster'

test('the Haruna pilot is deterministic and explicit', () => {
  assert.equal(assertAcceptanceRosterMode('pilot'), 'pilot')
  const plan = acceptanceRosterPlan('pilot')
  assert.equal(plan.mode, 'pilot')
  assert.equal(plan.version, ACCEPTANCE_PILOT_ROSTER_VERSION)
  assert.equal(plan.checksum, ACCEPTANCE_PILOT_ROSTER_CHECKSUM)
  assert.equal(plan.checksum, '82d14e4344424ca0d1829a5a82eefa9d559d0e4666e086ebd537074a588304b4')
  assert.equal(plan.students.length, 1)
  assert.deepEqual(plan.students, ACCEPTANCE_PILOT_STUDENTS)
  assert.equal(plan.students[0]?.id, 10002)
  assert.equal(acceptanceRosterFromOptions({ flag: 'pilot' }).checksum, ACCEPTANCE_PILOT_ROSTER_CHECKSUM)
})

test('roster selection never defaults to the pilot', () => {
  assert.throws(() => assertAcceptanceRosterMode(undefined), /--roster is required/)
  assert.throws(() => assertAcceptanceRosterMode('haruna'), /either pilot or full/)
  assert.throws(() => acceptanceRosterFromOptions({}), /--roster is required/)
})

test('catalog-scale acceptance uses the committed repository snapshot', () => {
  assert.equal(ACCEPTANCE_ROSTER_SNAPSHOT_PATH, 'scripts/chibi-acceptance-roster.snapshot.json')
  assert.equal(ACCEPTANCE_ROSTER_SNAPSHOT_VERSION, 1)
  assert.equal(assertAcceptanceRosterMode('full'), 'full')
  assert.equal(ACCEPTANCE_FULL_ROSTER_SNAPSHOT.version, 1)
  assert.equal(ACCEPTANCE_FULL_ROSTER_SNAPSHOT.source.file, ACCEPTANCE_ROSTER_SOURCE_FILE)
  assert.equal(ACCEPTANCE_FULL_ROSTER_SNAPSHOT.source.url, ACCEPTANCE_ROSTER_SOURCE_URL)
  assert.equal(ACCEPTANCE_FULL_ROSTER_SNAPSHOT.source.sha256, 'e6dc21d9b7dca86c44a6b40e4b4d4576470669ad3def68c0333d1b3566973ac1')
  assert.equal(ACCEPTANCE_FULL_ROSTER_SNAPSHOT.eligibleCount, 275)
  assert.equal(ACCEPTANCE_FULL_ROSTER_SNAPSHOT.students.length, 275)
  assert.equal(ACCEPTANCE_FULL_ROSTER_SNAPSHOT_CHECKSUM, 'f4b364bf6b0d35f41bc74c7e4bbe1aa48ded5d6c192393c910e71946211c7209')
  assert.equal(ACCEPTANCE_FULL_ROSTER_SNAPSHOT.comparison.mappedRosterBaselineCount, 274)
  assert.equal(ACCEPTANCE_FULL_ROSTER_SNAPSHOT.comparison.eligibleMinusMappedRoster, 1)
  const plan = acceptanceRosterPlan('full')
  assert.equal(plan.mode, 'full')
  assert.equal(plan.version, 1)
  assert.equal(plan.checksum, ACCEPTANCE_FULL_ROSTER_SNAPSHOT_CHECKSUM)
  assert.equal(plan.students.length, 275)
  assert.deepEqual(plan.students[0], { id: 10000, name: 'Aru', pathName: 'aru', devName: 'Aru', image: 'https://schaledb.com/images/student/collection/10000.webp', portrait: 'https://schaledb.com/images/student/portrait/10000.webp' })
})

test('eligibility provenance is the inclusive five-digit Student.id range', () => {
  assert.equal(CHIBI_ELIGIBLE_STUDENT_ID_MIN, 10000)
  assert.equal(CHIBI_ELIGIBLE_STUDENT_ID_MAX, 99999)
  assert.ok(/inclusive/.test(acceptanceRosterPlan('pilot').eligibility))
})

test('the committed full roster has unique eligible IDs and seed-only fields', () => {
  const rows = ACCEPTANCE_FULL_ROSTER_SNAPSHOT.students
  const ids = rows.map(student => student.id)
  assert.equal(new Set(ids).size, rows.length)
  assert.equal(ids[0], CHIBI_ELIGIBLE_STUDENT_ID_MIN)
  assert.equal(ids.at(-1), 26016)
  for (const student of rows) {
    assert.ok(Number.isInteger(student.id) && student.id >= CHIBI_ELIGIBLE_STUDENT_ID_MIN && student.id <= CHIBI_ELIGIBLE_STUDENT_ID_MAX)
    assert.ok(student.name.trim())
    assert.ok(student.pathName === null || student.pathName.trim())
    assert.ok(student.devName === null || student.devName.trim())
    assert.deepEqual(Object.keys(student).sort(), ['devName', 'id', 'name', 'pathName'])
  }
})
