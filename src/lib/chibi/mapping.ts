import { emptyChibiProfile, type ChibiProfile } from './types'
import type { SourceCandidate } from './inventory'

export interface MappingStudent { id: number; name: string; pathName: string | null; devName?: string | null }
export interface ExistingBinding {
  assetId?: string | null
  sourceIdentity: string | null
  identityPath: string | null
  provenance: string
  profile: unknown
  overrides: unknown
  arrangementOverride?: unknown
  catalogVisible?: boolean
  updatedAt?: Date
}
export interface ReviewedOverrides {
  sourceIdentity?: string
  identityPath?: string | null
  profile?: ChibiProfile
  approvedCandidateFingerprint?: string
  [key: string]: unknown
}
export type MappingDecision =
  | { status: 'mapped'; source: SourceCandidate; provenance: 'manual' | 'canonical'; profile: ChibiProfile }
  | { status: 'review-required'; candidates: SourceCandidate[]; reason: string }
  | { status: 'unavailable'; candidates: []; reason: string }

const CANONICAL_SOURCE_ALIASES: Readonly<Record<number, string>> = {
  // SchaleDB's cycling variant is named RidingSuit in the source archives.
  10024: 'shiroko_ridingsuit',
  // This named candidate is only a clip dependency; CH0155 owns Natsu's
  // authoritative prefab and material set.
  10029: 'ch0155',
  // The named swimsuit candidate lacks Wakamo's facial material set; CH0175
  // owns the authoritative swimsuit prefab and face textures.
  10043: 'ch0175',
  // SchaleDB uses Reijo/CH0134 while the source archives use this stable
  // transliteration in their character folder and authoritative prefab.
  10104: 'reizyo_original',
}

export function canonicalIdentity(value: string | null) {
  return value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || null
}

export function candidateIdentityPaths(source: SourceCandidate) {
  return new Set([source.sourceIdentity, ...(source.objectNames ?? [])].map(value => canonicalIdentity(value))
    .filter((value): value is string => !!value)
    .flatMap(value => [value, value.replace(/^(cafe|formation|battle)_/, '')]))
}

function isProfile(value: unknown): value is ChibiProfile {
  if (!value || typeof value !== 'object') return false
  const profile = value as Partial<ChibiProfile>
  return typeof profile.label === 'string' && typeof profile.idleLabel === 'string' && !!profile.interactions
}

export function defaultProfile(source: SourceCandidate): ChibiProfile {
  const profile = emptyChibiProfile(source.sourceIdentity)
  // Dependency closures contain shared controllers and clips from other
  // characters.  Only clips whose canonical prefix is the indexed source
  // identity are safe defaults; borrowing a same-shaped clip from a shared
  // bundle can silently publish the wrong outfit's animation.
  const identity = canonicalIdentity(source.sourceIdentity)
  const clips = identity
    ? source.clips.filter(clip => {
      const clipIdentity = canonicalIdentity(clip)
      return !!clipIdentity && (clipIdentity === identity || clipIdentity.startsWith(`${identity}_`))
    })
    : []
  const choices: Record<keyof ChibiProfile['interactions'], string[]> = {
    idle: ['cafe_idle', 'formation_idle', 'battle_idle'],
    walk: ['cafe_walk', 'walk'],
    pickup: ['formation_pickup', 'pickup'],
    touch: ['cafe_reaction', 'reaction', 'touch'],
  }
  for (const [action, suffixes] of Object.entries(choices) as [keyof typeof choices, string[]][]) {
    const clip = suffixes.map(suffix => clips.find(name => canonicalIdentity(name) === `${identity}_${suffix}`)
      ?? clips.find(name => canonicalIdentity(name)?.endsWith(`_${suffix}`))).find(Boolean)
    if (clip) profile.interactions[action] = {
      state: 'available', clip, loop: action === 'idle' || action === 'walk', hold: action === 'pickup',
    }
  }
  const idle = profile.interactions.idle
  profile.initialPose = idle.state === 'available' ? idle.clip ?? null : null
  profile.idleLabel = idle.state === 'available' ? 'Verified source idle' : 'Static preview · no verified idle'
  return profile
}

export function sourceAnimationClips(source: SourceCandidate, profile: ChibiProfile): string[] {
  // The dependency closure also indexes shared controller entries and other
  // outfits. Keep every character-owned clip plus reviewed assignments.
  const identity = canonicalIdentity(source.sourceIdentity)
  const owned = identity ? (source.clips ?? []).filter(clip => {
    const clipIdentity = canonicalIdentity(clip)
    return !!clipIdentity && (clipIdentity === identity || clipIdentity.startsWith(`${identity}_`))
  }) : []
  const assigned = [profile.initialPose, ...Object.values(profile.interactions)
    .filter(interaction => interaction.state === 'available').map(interaction => interaction.clip)]
    .filter((clip): clip is string => typeof clip === 'string' && !!clip)
  return [...new Set([...assigned, ...owned])]
}

export function mapStudentToSources(student: MappingStudent, sources: readonly SourceCandidate[], binding?: ExistingBinding | null): MappingDecision {
  const byIdentity = new Map(sources.map(source => [canonicalIdentity(source.sourceIdentity), source]))
  const overrides = binding?.overrides && typeof binding.overrides === 'object' ? binding.overrides as ReviewedOverrides : null
  if (binding?.provenance === 'manual' && overrides?.sourceIdentity) {
    const selected = byIdentity.get(canonicalIdentity(overrides.sourceIdentity))
    if (!selected) return { status: 'review-required', candidates: [], reason: 'Approved source identity is missing.' }
    if (selected.conflict) return { status: 'review-required', candidates: [selected], reason: 'Approved source identity has conflicting revisions.' }
    if (overrides.approvedCandidateFingerprint !== selected.fingerprint) {
      return { status: 'review-required', candidates: [selected], reason: 'Approved source revision changed.' }
    }
    if (canonicalIdentity(overrides.identityPath ?? null) !== canonicalIdentity(student.pathName)) {
      return { status: 'review-required', candidates: [selected], reason: 'Student identity path changed after approval.' }
    }
    return { status: 'mapped', source: selected, provenance: 'manual', profile: isProfile(overrides.profile) ? overrides.profile : defaultProfile(selected) }
  }
  const identityPath = canonicalIdentity(student.pathName)
  const sourceIdentity = canonicalIdentity(student.devName ?? null)
  if (!identityPath && !sourceIdentity) return { status: 'unavailable', candidates: [], reason: 'Student has no canonical source identity.' }
  if (binding?.identityPath && canonicalIdentity(binding.identityPath) !== identityPath) {
    return { status: 'review-required', candidates: [], reason: 'Student identity path changed after mapping.' }
  }
  // Haruna's corrected source is explicitly the original outfit.  Prefer it
  // when both a legacy `haruna` identity and the reviewed original identity
  // are present; all other students remain exact path-first mappings.
  const identities = [...new Set([CANONICAL_SOURCE_ALIASES[student.id], identityPath, sourceIdentity].filter((value): value is string => !!value))]
  const direct = identities.map(identity => student.id === 10002
    ? byIdentity.get(`${identity}_original`) ?? byIdentity.get(identity)
    : byIdentity.get(identity) ?? byIdentity.get(`${identity}_original`)).find(Boolean)
  const named = direct ? [] : identities.flatMap(identity => sources.filter(source => {
    const paths = candidateIdentityPaths(source)
    return paths.has(identity) || paths.has(`${identity}_original`)
  })).filter((source, index, matches) => matches.indexOf(source) === index)
  const exact = direct ?? (named.length === 1 ? named[0] : undefined)
  if (!direct && named.length > 1) return { status: 'review-required', candidates: named, reason: 'Multiple sources claim the exact canonical model name.' }
  if (!exact) return { status: 'unavailable', candidates: [], reason: 'No exact canonical source identity was found.' }
  if (exact.conflict) return { status: 'review-required', candidates: [exact], reason: 'Source identity has conflicting contents.' }
  return { status: 'mapped', source: exact, provenance: 'canonical', profile: defaultProfile(exact) }
}
