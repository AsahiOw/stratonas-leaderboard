import { ChibiInputError, record } from './api-input'
import type { ChibiProfile } from './types'

export const PLAYGROUND_ROLES = ['idle', 'walk', 'greeting', 'reaction', 'performance', 'watch', 'toy', 'pickup'] as const
export type PlaygroundRole = typeof PLAYGROUND_ROLES[number]
export type PlaygroundClip = { clip: string; loop: boolean }
export type PlaygroundMapping = { version: 1; sourceIdentity: string; roles: Record<PlaygroundRole, PlaygroundClip[]> }

export function initialPlaygroundMapping(sourceIdentity: string, profile: ChibiProfile): PlaygroundMapping {
  const roles: PlaygroundMapping['roles'] = { idle: [], walk: [], greeting: [], reaction: [], performance: [], watch: [], toy: [], pickup: [] }
  for (const [role, action] of [['idle', 'idle'], ['walk', 'walk'], ['reaction', 'touch'], ['pickup', 'pickup']] as const) {
    const entry = profile.interactions[action]
    if (entry?.state === 'available' && entry.clip) roles[role] = [{ clip: entry.clip, loop: role === 'idle' || role === 'walk' || role === 'pickup' }]
  }
  return { version: 1, sourceIdentity, roles }
}

export function readPlaygroundMapping(value: unknown, sourceIdentity: string, clips: string[]): PlaygroundMapping {
  const body = record(value)
  if (body.version !== 1 || body.sourceIdentity !== sourceIdentity) throw new ChibiInputError('The animation mapping belongs to a different student model.')
  const input = record(body.roles), allowed = new Set(clips)
  const roles = {} as PlaygroundMapping['roles']
  for (const key of Object.keys(input)) if (!PLAYGROUND_ROLES.includes(key as PlaygroundRole)) throw new ChibiInputError(`Unknown animation role: ${key}.`)
  for (const role of PLAYGROUND_ROLES) {
    const entries = input[role]
    if (!Array.isArray(entries) || entries.length > 8) throw new ChibiInputError(`Choose at most eight clips for ${role}.`)
    roles[role] = entries.map(value => {
      const entry = record(value)
      if (typeof entry.clip !== 'string' || !allowed.has(entry.clip)) throw new ChibiInputError(`${role} must use a clip from this student's active model.`)
      if (typeof entry.loop !== 'boolean') throw new ChibiInputError('Choose whether the animation loops.')
      return { clip: entry.clip, loop: entry.loop }
    })
    if (new Set(roles[role].map(entry => entry.clip)).size !== roles[role].length) throw new ChibiInputError(`Duplicate ${role} animation.`)
  }
  return { version: 1, sourceIdentity, roles }
}
