import type { ChibiArrangementDelta } from './arrangement'

export const CHIBI_ACTIONS = ['idle', 'walk', 'pickup', 'touch'] as const
export type ChibiAction = typeof CHIBI_ACTIONS[number]
export type ChibiInteractionState = 'available' | 'unsupported' | 'unresolved' | 'failed'
export interface ChibiInteraction {
  state: ChibiInteractionState
  clip?: string
  reason?: string
  loop?: boolean
  hold?: boolean
  speed?: number
}
export interface ChibiProfile {
  label: string
  initialPose: string | null
  idleLabel: string
  interactions: Record<ChibiAction, ChibiInteraction>
}
export interface ChibiCatalogStudent {
  id: number
  name: string
  pathName: string | null
  image: string
  portrait: string | null
  status: string
  diagnostic: string | null
  model: null | {
    assetId: string
    revision: string
    url: string
    sourceIdentity: string
    profile: ChibiProfile
    arrangement?: ChibiArrangementDelta
    arrangementDefault?: ChibiArrangementDelta
  }
}
export function isEligibleStudentId(id: unknown): id is number {
  return typeof id === 'number' && Number.isInteger(id) && id >= 10000 && id <= 99999
}
export function emptyChibiProfile(label = 'Static preview'): ChibiProfile {
  return {
    label, initialPose: null, idleLabel: 'Static preview · no verified idle',
    interactions: Object.fromEntries(CHIBI_ACTIONS.map(action => [action, {
      state: 'unresolved', reason: 'No verified source clip has been assigned.',
    }])) as ChibiProfile['interactions'],
  }
}
