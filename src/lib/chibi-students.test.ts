import assert from 'node:assert/strict'
import test from 'node:test'
import { chibiModels, resolveChibiStudent, type ChibiStudentRow } from './chibi-students'

const haruna = chibiModels[0]

function row(overrides: Partial<ChibiStudentRow> = {}): ChibiStudentRow {
  return {
    id: 10002,
    name: 'Haruna',
    pathName: 'haruna',
    ...overrides,
  }
}

test('resolves the base Haruna row by exact id and normalized identity fields', () => {
  const result = resolveChibiStudent([row({ name: '  HARUNA ', pathName: ' HARUNA ' })])

  assert.equal(result.status, 'matched')
  assert.equal(result.student.id, 10002)
})

test('keeps an id/path binding when the display name changes', () => {
  const result = resolveChibiStudent([row({ name: 'Localized Haruna Name' })])
  assert.equal(result.status, 'matched')
})

test('does not map a different Haruna variant id to the original model', () => {
  const result = resolveChibiStudent([{
    id: 10057,
    name: 'Haruna (New Year)',
    pathName: 'haruna_newyear',
  }])

  assert.deepEqual(result, {
    status: 'unmatched',
    model: haruna,
    student: null,
    reason: 'student-id-not-found',
  })
})

test('reports a mismatched row with the expected id explicitly', () => {
  const result = resolveChibiStudent([row({ pathName: 'haruna_track' })])

  assert.equal(result.status, 'variant-mismatch')
  assert.deepEqual(result.mismatchedFields, ['pathName'])
})

test('returns an explicit unmatched result when the database row is absent', () => {
  const result = resolveChibiStudent([{
    id: 99999,
    name: 'Unknown Student',
    pathName: 'unknown_student',
  }])

  assert.deepEqual(result, {
    status: 'unmatched',
    model: haruna,
    student: null,
    reason: 'student-id-not-found',
  })
})
