export type ChibiClip = 'idle' | 'walk' | 'pickup' | 'touch'

export interface ChibiModelClips extends Record<ChibiClip, string> {}

export interface ChibiStudentModel {
  readonly id: string
  readonly name: string
  readonly studentId: number
  readonly pathName: string
  readonly modelUrl: string
  readonly clips: ChibiModelClips
}

/** The only Student fields needed to resolve a chibi model. */
export interface ChibiStudentRow {
  readonly id: number
  readonly name: string
  readonly pathName: string | null
}

export type ChibiStudentMismatchField = 'id' | 'name' | 'pathName'

export type ChibiStudentResolution =
  | {
    readonly status: 'matched'
    readonly model: ChibiStudentModel
    readonly student: ChibiStudentRow
  }
  | {
    readonly status: 'variant-mismatch'
    readonly model: ChibiStudentModel
    readonly student: ChibiStudentRow
    readonly mismatchedFields: readonly ChibiStudentMismatchField[]
  }
  | {
    readonly status: 'unmatched'
    readonly model: ChibiStudentModel
    readonly student: null
    readonly reason: 'student-id-not-found'
  }

/**
 * The starter model is the original Haruna student (SchaleDB id 10002).
 * The imported database currently stores its path name in lowercase.
 */
export const chibiModels = [
  {
    id: 'haruna_original',
    name: 'Haruna',
    studentId: 10002,
    pathName: 'haruna',
    modelUrl: '/assets/chibi/haruna-original.glb?v=3',
    clips: {
      idle: 'Haruna_Original_Cafe_Idle',
      walk: 'Haruna_Original_Cafe_Walk',
      pickup: 'Haruna_Original_Formation_Pickup',
      touch: 'Haruna_Original_Cafe_Reaction',
    },
  },
] as const satisfies readonly ChibiStudentModel[]

function normalizeIdentityText(value: string | null) {
  return value?.trim().toLowerCase() || null
}

function identityMismatches(model: ChibiStudentModel, student: ChibiStudentRow) {
  const mismatches: ChibiStudentMismatchField[] = []
  if (student.id !== model.studentId) mismatches.push('id')
  if (normalizeIdentityText(student.pathName) !== normalizeIdentityText(model.pathName)) mismatches.push('pathName')
  return mismatches
}

/**
 * Resolve a model against already-fetched Student rows without querying or
 * mutating the database. The database id is authoritative; a display-name
 * change does not invalidate a binding, while an identity-path change does.
 */
export function resolveChibiStudent(
  students: readonly ChibiStudentRow[],
  model: ChibiStudentModel = chibiModels[0],
): ChibiStudentResolution {
  const studentById = students.find((student) => student.id === model.studentId)
  if (studentById) {
    const mismatchedFields = identityMismatches(model, studentById)
    if (mismatchedFields.length === 0) {
      return { status: 'matched', model, student: studentById }
    }

    return { status: 'variant-mismatch', model, student: studentById, mismatchedFields }
  }

  return { status: 'unmatched', model, student: null, reason: 'student-id-not-found' }
}
