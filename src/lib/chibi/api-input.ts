import { CHIBI_ACTIONS, isEligibleStudentId, type ChibiProfile } from './types'

export class ChibiInputError extends Error {}
/** Optimistic-concurrency failure for an admin edit against a replaced asset. */
export class ChibiStaleError extends ChibiInputError {}
export const IMPORT_MODES = ['audit', 'update', 'update-missing-animations', 'retry-failed', 'force-rebuild', 'download-assets'] as const
export function readImportInput(value: unknown) {
  const body = record(value)
  if (!IMPORT_MODES.includes(body.mode as typeof IMPORT_MODES[number])) throw new ChibiInputError('Choose a valid import mode.')
  const selection = body.studentIds ?? []
  if (!Array.isArray(selection) || selection.some(id => !isEligibleStudentId(id))) {
    throw new ChibiInputError('Student IDs must be integers from 10000 through 99999.')
  }
  const studentIds = [...new Set(selection as number[])]
  if (body.mode === 'download-assets' && studentIds.length) throw new ChibiInputError('AssetBundle downloads apply to the whole source collection.')
  if (body.mode === 'update-missing-animations' && studentIds.length) throw new ChibiInputError('Students missing animations are selected automatically.')
  if (body.mode === 'force-rebuild' && !studentIds.length) throw new ChibiInputError('Select students to force rebuild.')
  return { mode: body.mode as typeof IMPORT_MODES[number], studentIds }
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ChibiInputError('Expected a JSON object.')
  return value as Record<string, unknown>
}
export function sourceIdentity(value: unknown) {
  if (typeof value !== 'string' || !value.trim() || value.length > 1000) throw new ChibiInputError('Select an indexed source model.')
  return value
}
export function readProfile(value: unknown, clips: string[]): ChibiProfile {
  const body = record(value)
  if (typeof body.label !== 'string' || !body.label.trim() || body.label.length > 200) throw new ChibiInputError('Enter a profile label.')
  if (typeof body.idleLabel !== 'string' || body.idleLabel.length > 300) throw new ChibiInputError('Enter an idle or static-preview label.')
  if (body.initialPose !== null && (typeof body.initialPose !== 'string' || !clips.includes(body.initialPose))) {
    throw new ChibiInputError('Initial pose must belong to the selected model, or be static.')
  }
  const inputs = record(body.interactions)
  const interactions = {} as ChibiProfile['interactions']
  for (const action of CHIBI_ACTIONS) {
    const entry = record(inputs[action])
    if (!['available', 'unsupported', 'unresolved', 'failed'].includes(String(entry.state))) throw new ChibiInputError(`Invalid ${action} state.`)
    if (entry.state === 'available') {
      if (typeof entry.clip !== 'string' || !clips.includes(entry.clip)) throw new ChibiInputError(`${action} must use a clip belonging to the selected model.`)
      const speed = entry.speed ?? 1
      if (typeof speed !== 'number' || !Number.isFinite(speed) || speed <= 0 || speed > 4) throw new ChibiInputError('Playback speed must be greater than zero and at most four.')
      interactions[action] = { state: 'available', clip: entry.clip, speed, loop: action === 'idle' || action === 'walk', hold: action === 'pickup' }
    } else {
      if (typeof entry.reason !== 'string' || !entry.reason.trim() || entry.reason.length > 1000) throw new ChibiInputError(`Explain why ${action} is ${entry.state}.`)
      interactions[action] = { state: entry.state as 'unsupported' | 'unresolved' | 'failed', reason: entry.reason.trim() }
    }
  }
  return { label: body.label.trim(), initialPose: body.initialPose as string | null, idleLabel: body.idleLabel, interactions }
}
export function candidateClips(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return []
  const values = (metadata as Record<string, unknown>).clips
  if (!Array.isArray(values)) return []
  return values.flatMap(value => typeof value === 'string' ? [value] : value && typeof value.name === 'string' ? [value.name] : [])
}
