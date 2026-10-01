import { ChibiInputError } from './api-input'

/** Versioned runtime arrangement payload. An empty object preserves the GLB baseline. */
export const CHIBI_ARRANGEMENT_SCHEMA_VERSION = 1 as const
export const CHIBI_ARRANGEMENT_MODEL_KEY = '$model' as const
export const CHIBI_ARRANGEMENT_MAX_NODES = 128
export const CHIBI_ARRANGEMENT_MAX_KEY_LENGTH = 512
export const CHIBI_ARRANGEMENT_MAX_LABEL_LENGTH = 160
export const CHIBI_ARRANGEMENT_CORRECTION_LIMITS = {
  position: { min: -0.5, max: 0.5 },
  rotation: { min: -45, max: 45 },
  scale: { min: 0.75, max: 1.25 },
} as const

const CHIBI_ARRANGEMENT_CORRECTION_TOLERANCE = 1e-8

export type ChibiArrangementVector3 = readonly [number, number, number]
export type ChibiArrangementQuaternion = readonly [number, number, number, number]

export interface ChibiArrangementNodeDelta {
  depthTest?: boolean
  depthOffset?: number
  visible?: boolean
  position?: ChibiArrangementVector3
  rotation?: ChibiArrangementQuaternion
  scale?: ChibiArrangementVector3
}

export interface ChibiArrangementDelta {
  schemaVersion: typeof CHIBI_ARRANGEMENT_SCHEMA_VERSION
  nodes: Readonly<Record<string, ChibiArrangementNodeDelta>>
}

export type ChibiArrangementNodeKind = 'model' | 'equipment' | 'face-layer'
export interface ChibiArrangementAllowedNode {
  key: string
  kind: ChibiArrangementNodeKind
  label: string
}

const NODE_KEYS = ['visible', 'position', 'rotation', 'scale', 'depthTest', 'depthOffset'] as const
const NODE_KEY_SET = new Set<string>(NODE_KEYS)
const MODEL_NODE: ChibiArrangementAllowedNode = {
  key: CHIBI_ARRANGEMENT_MODEL_KEY,
  kind: 'model',
  label: 'Model',
}

function fail(message: string): never {
  throw new ChibiInputError(`Invalid chibi arrangement: ${message}`)
}

function plainRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object.`)
  return value as Record<string, unknown>
}

function finiteCoordinate(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 100000) {
    fail(`${label} must be a finite number in [-100000, 100000].`)
  }
  return value
}

function vector(value: unknown, label: string, length: 3 | 4): ChibiArrangementVector3 | ChibiArrangementQuaternion {
  if (!Array.isArray(value) || value.length !== length) fail(`${label} must have ${length} finite values.`)
  return value.map((item, index) => finiteCoordinate(item, `${label}[${index}]`)) as unknown as ChibiArrangementVector3 | ChibiArrangementQuaternion
}

function parseNode(value: unknown, label: string): ChibiArrangementNodeDelta {
  const record = plainRecord(value, label)
  for (const key of Object.keys(record)) if (!NODE_KEY_SET.has(key)) fail(`${label}.${key} is not an allowed field.`)
  if (!Object.keys(record).length) fail(`${label} must set at least one field.`)
  const result: ChibiArrangementNodeDelta = {}
  if ('depthTest' in record) {
    if (typeof record.depthTest !== 'boolean') fail(`${label}.depthTest must be boolean.`)
    result.depthTest = record.depthTest
  }
  if ('depthOffset' in record) {
    if (typeof record.depthOffset !== 'number' || !Number.isFinite(record.depthOffset) || Math.abs(record.depthOffset) > 10) fail(`${label}.depthOffset must be in [-10, 10].`)
    result.depthOffset = record.depthOffset
  }
  if ('visible' in record) {
    if (typeof record.visible !== 'boolean') fail(`${label}.visible must be boolean.`)
    result.visible = record.visible
  }
  if ('position' in record) result.position = vector(record.position, `${label}.position`, 3) as ChibiArrangementVector3
  if ('rotation' in record) result.rotation = vector(record.rotation, `${label}.rotation`, 4) as ChibiArrangementQuaternion
  if ('scale' in record) result.scale = vector(record.scale, `${label}.scale`, 3) as ChibiArrangementVector3
  return result
}

function canonicalNodes(nodes: Record<string, ChibiArrangementNodeDelta>) {
  return Object.fromEntries(Object.keys(nodes).sort((left, right) => left.localeCompare(right)).map(key => {
    const value = nodes[key]
    const ordered: ChibiArrangementNodeDelta = {}
    for (const field of NODE_KEYS) if (field in value) ordered[field] = value[field] as never
    return [key, ordered]
  })) as Readonly<Record<string, ChibiArrangementNodeDelta>>
}

/**
 * Parse the finite runtime DTO. `{}` is accepted as the stored empty delta so
 * older assets continue to mean “use the authored GLB baseline”.
 */
export function parseChibiArrangementDelta(value: unknown, label = 'arrangement'): ChibiArrangementDelta {
  if (value === undefined || value === null) fail(`${label} is required.`)
  if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0) {
    return { schemaVersion: CHIBI_ARRANGEMENT_SCHEMA_VERSION, nodes: {} }
  }
  const record = plainRecord(value, label)
  const version = record.schemaVersion
  if (version !== CHIBI_ARRANGEMENT_SCHEMA_VERSION) fail(`${label}.schemaVersion must be ${CHIBI_ARRANGEMENT_SCHEMA_VERSION}.`)
  const rawNodes = record.nodes
  const nodesRecord = plainRecord(rawNodes, `${label}.nodes`)
  const keys = Object.keys(nodesRecord)
  if (keys.length > CHIBI_ARRANGEMENT_MAX_NODES) fail(`${label}.nodes exceeds ${CHIBI_ARRANGEMENT_MAX_NODES} entries.`)
  const nodes: Record<string, ChibiArrangementNodeDelta> = {}
  for (const key of keys) {
    if (!key || key.length > CHIBI_ARRANGEMENT_MAX_KEY_LENGTH || key.includes('\u0000')) fail(`${label}.nodes contains an invalid key.`)
    nodes[key] = parseNode(nodesRecord[key], `${label}.nodes[${JSON.stringify(key)}]`)
  }
  for (const key of Object.keys(record)) if (key !== 'schemaVersion' && key !== 'nodes') fail(`${label}.${key} is not an allowed field.`)
  return { schemaVersion: CHIBI_ARRANGEMENT_SCHEMA_VERSION, nodes: canonicalNodes(nodes) }
}

export function emptyChibiArrangementDelta(): ChibiArrangementDelta {
  return { schemaVersion: CHIBI_ARRANGEMENT_SCHEMA_VERSION, nodes: {} }
}

/** Override fields win per node; neither input is mutated. */
export function mergeChibiArrangementDelta(baseValue: unknown, overrideValue: unknown): ChibiArrangementDelta {
  const base = parseChibiArrangementDelta(baseValue, 'arrangementDefault')
  const override = parseChibiArrangementDelta(overrideValue, 'arrangementOverride')
  const nodes: Record<string, ChibiArrangementNodeDelta> = {}
  for (const [key, value] of Object.entries(base.nodes)) nodes[key] = { ...value }
  for (const [key, value] of Object.entries(override.nodes)) nodes[key] = { ...(nodes[key] ?? {}), ...value }
  return { schemaVersion: CHIBI_ARRANGEMENT_SCHEMA_VERSION, nodes: canonicalNodes(nodes) }
}

function sourceReferenceKey(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  return typeof record.bundleSha256 === 'string'
    && typeof record.serializedFile === 'string'
    && typeof record.objectId === 'string'
    ? `${record.bundleSha256.toLowerCase()}:${record.serializedFile.replaceAll('\\', '/').toLowerCase()}:${record.objectId}`
    : null
}

function exactEquipmentArrangementWarning(value: unknown): ChibiArrangementAllowedNode | null {
  if (!value || typeof value !== 'object') return null
  const warning = value as Record<string, unknown>
  if (warning.reasonCode !== 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT'
    || typeof warning.message !== 'string' || !warning.message) return null
  const blocker = warning.blocker
  if (!blocker || typeof blocker !== 'object') return null
  const record = blocker as Record<string, unknown>
  if (record.reasonCode !== warning.reasonCode || typeof record.name !== 'string' || !record.name) return null
  const key = sourceReferenceKey(record.sourceReference)
  const meshKey = sourceReferenceKey(record.sourceMeshReference)
  if (!key || !meshKey) return null
  const materials = Array.isArray(record.sourceMaterialReferences) ? record.sourceMaterialReferences : []
  const shaders = Array.isArray(record.sourceShaderReferences) ? record.sourceShaderReferences : []
  if (!materials.length || !shaders.length) return null
  const materialKeys = materials.map(sourceReferenceKey)
  const shaderKeys = shaders.map(sourceReferenceKey)
  if (materialKeys.some(item => !item) || shaderKeys.some(item => !item)) return null
  const evidence = Array.isArray(record.evidence) ? record.evidence : []
  const requiredEvidence = [
    `exact source renderer reference ${key}`,
    `exact source mesh reference ${meshKey}`,
    ...materialKeys.map(item => `exact source material reference ${item}`),
    ...shaderKeys.map(item => `exact source shader reference ${item}`),
  ]
  if (requiredEvidence.some(item => !evidence.includes(item))
    || !evidence.some(item => typeof item === 'string' && item.startsWith('renderer name has authored equipment term(s): '))
    || !evidence.includes('selected assembly has no authoritative equipment renderer or main/sub-weapon attachment relation for this renderer')) return null
  const label = typeof record.hierarchyPath === 'string' && record.hierarchyPath
    ? record.hierarchyPath
    : record.name
  if (label.length > CHIBI_ARRANGEMENT_MAX_LABEL_LENGTH) return null
  return { key, kind: 'equipment', label }
}

/** Build the exact server-provided arrangement allowlist from persisted profile evidence. */
export function buildChibiArrangementAllowedNodes(profile: unknown): ChibiArrangementAllowedNode[] {
  const record = profile && typeof profile === 'object' ? profile as Record<string, unknown> : {}
  const evidence = Array.isArray(record.equipmentBindingEvidence)
    ? record.equipmentBindingEvidence
    : record.validation && typeof record.validation === 'object' && Array.isArray((record.validation as Record<string, unknown>).equipmentBindingEvidence)
      ? (record.validation as Record<string, unknown>).equipmentBindingEvidence as unknown[]
      : record.renderingProfile && typeof record.renderingProfile === 'object' && Array.isArray((record.renderingProfile as Record<string, unknown>).equipmentBindingEvidence)
        ? (record.renderingProfile as Record<string, unknown>).equipmentBindingEvidence as unknown[]
      : []
  const values = new Map<string, ChibiArrangementAllowedNode>([[MODEL_NODE.key, MODEL_NODE]])
  values.set('$eyes', { key: '$eyes', kind: 'face-layer', label: 'Eyes / mouth' })
  values.set('$eyebrows', { key: '$eyebrows', kind: 'face-layer', label: 'Eyebrows' })
  for (const item of evidence) {
    if (!item || typeof item !== 'object') continue
    const entry = item as Record<string, unknown>
    const key = sourceReferenceKey(entry.sourceReference)
    if (!key) continue
    const label = typeof entry.hierarchyPath === 'string' && entry.hierarchyPath
      ? entry.hierarchyPath
      : typeof entry.name === 'string' && entry.name ? entry.name : key
    if (label.length > CHIBI_ARRANGEMENT_MAX_LABEL_LENGTH) continue
    values.set(key, { key, kind: 'equipment', label })
  }
  const nestedValidation = record.validation && typeof record.validation === 'object'
    ? record.validation as Record<string, unknown>
    : null
  const nestedRenderingProfile = record.renderingProfile && typeof record.renderingProfile === 'object'
    ? record.renderingProfile as Record<string, unknown>
    : null
  const warningArrays = [
    record.warnings,
    nestedValidation?.warnings,
    nestedRenderingProfile?.warnings,
    nestedRenderingProfile?.validation && typeof nestedRenderingProfile.validation === 'object'
      ? (nestedRenderingProfile.validation as Record<string, unknown>).warnings : undefined,
  ].filter((items): items is unknown[] => Array.isArray(items))
  for (const warning of warningArrays.flat()) {
    const allowed = exactEquipmentArrangementWarning(warning)
    if (allowed) values.set(allowed.key, allowed)
  }
  return [...values.values()].sort((left, right) => left.key === CHIBI_ARRANGEMENT_MODEL_KEY ? -1 : right.key === CHIBI_ARRANGEMENT_MODEL_KEY ? 1 : left.key.localeCompare(right.key))
}

export function arrangementAllowedKeys(profile: unknown): Set<string> {
  return new Set(buildChibiArrangementAllowedNodes(profile).map(node => node.key))
}

/** Reparse a delta and enforce the source-evidenced node allowlist. */
export function parseAllowedChibiArrangementDelta(value: unknown, profile: unknown, label = 'arrangement'): ChibiArrangementDelta {
  const parsed = parseChibiArrangementDelta(value, label)
  const allowed = arrangementAllowedKeys(profile)
  for (const key of Object.keys(parsed.nodes)) if (!allowed.has(key)) fail(`${label}.nodes[${JSON.stringify(key)}] is not an allowlisted model/equipment key.`)
  for (const [key, node] of Object.entries(parsed.nodes)) {
    const faceLayer = key === '$eyes' || key === '$eyebrows'
    for (const field of Object.keys(node)) {
      if (faceLayer !== (field === 'depthTest' || field === 'depthOffset')) fail(`${label}.nodes[${JSON.stringify(key)}].${field} is not allowed for this control.`)
    }
  }
  return parsed
}

function normalizedQuaternion(value: ChibiArrangementQuaternion): ChibiArrangementQuaternion {
  const length = Math.hypot(...value)
  return length > 1e-12 ? value.map(component => component / length) as unknown as ChibiArrangementQuaternion : [0, 0, 0, 1]
}

function multiplyQuaternion(leftValue: ChibiArrangementQuaternion, rightValue: ChibiArrangementQuaternion): ChibiArrangementQuaternion {
  const [x1, y1, z1, w1] = normalizedQuaternion(leftValue)
  const [x2, y2, z2, w2] = normalizedQuaternion(rightValue)
  return normalizedQuaternion([
    w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
    w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
    w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
    w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
  ])
}

function quaternionToEuler(rotation: ChibiArrangementQuaternion): [number, number, number] {
  const [x, y, z, w] = rotation
  const sinX = 2 * (w * x + y * z), cosX = 1 - 2 * (x * x + y * y)
  const sinY = 2 * (w * y - z * x), cosY = 1 - 2 * (y * y + z * z)
  const sinZ = 2 * (w * z + x * y), cosZ = 1 - 2 * (z * z + y * y)
  return [
    Math.atan2(sinX, cosX) * 180 / Math.PI,
    Math.asin(Math.max(-1, Math.min(1, sinY))) * 180 / Math.PI,
    Math.atan2(sinZ, cosZ) * 180 / Math.PI,
  ]
}

function within(value: number, min: number, max: number) {
  return value >= min - CHIBI_ARRANGEMENT_CORRECTION_TOLERANCE
    && value <= max + CHIBI_ARRANGEMENT_CORRECTION_TOLERANCE
}

/**
 * Parse an admin binding override and enforce the same baseline-relative
 * correction bounds used by the /3D adjustment controls.
 */
export function parseAllowedChibiArrangementOverride(
  value: unknown,
  profile: unknown,
  arrangementDefaultValue: unknown,
  label = 'arrangementOverride',
): ChibiArrangementDelta {
  const override = parseAllowedChibiArrangementDelta(value, profile, label)
  const arrangementDefault = parseChibiArrangementDelta(arrangementDefaultValue ?? {}, 'arrangementDefault')
  const effective = mergeChibiArrangementDelta(arrangementDefault, override)

  for (const key of Object.keys(override.nodes)) {
    const proposedRotation = override.nodes[key].rotation
    if (proposedRotation && Math.hypot(...proposedRotation) <= 1e-12) {
      fail(`${label}.nodes[${JSON.stringify(key)}].rotation must be a non-zero quaternion.`)
    }
    const baseline = arrangementDefault.nodes[key] ?? {}
    const target = effective.nodes[key] ?? {}
    const baselinePosition = baseline.position ?? [0, 0, 0]
    const targetPosition = target.position ?? [0, 0, 0]
    if (targetPosition.some((value, axis) => !within(value - baselinePosition[axis], CHIBI_ARRANGEMENT_CORRECTION_LIMITS.position.min, CHIBI_ARRANGEMENT_CORRECTION_LIMITS.position.max))) {
      fail(`${label}.nodes[${JSON.stringify(key)}].position correction exceeds the allowed range.`)
    }

    const baselineRotation = normalizedQuaternion(baseline.rotation ?? [0, 0, 0, 1])
    const targetRotation = normalizedQuaternion(target.rotation ?? baselineRotation)
    const inverseBaseline: ChibiArrangementQuaternion = [-baselineRotation[0], -baselineRotation[1], -baselineRotation[2], baselineRotation[3]]
    const rotationCorrection = quaternionToEuler(multiplyQuaternion(targetRotation, inverseBaseline))
    if (rotationCorrection.some(value => !within(value, CHIBI_ARRANGEMENT_CORRECTION_LIMITS.rotation.min, CHIBI_ARRANGEMENT_CORRECTION_LIMITS.rotation.max))) {
      fail(`${label}.nodes[${JSON.stringify(key)}].rotation correction exceeds the allowed range.`)
    }

    const baselineScale = baseline.scale ?? [1, 1, 1]
    const targetScale = target.scale ?? baselineScale
    if (targetScale.some((value, axis) => {
      if (baselineScale[axis] === 0) return !within(value, 0, 0)
      const factor = value / baselineScale[axis]
      return !within(factor, CHIBI_ARRANGEMENT_CORRECTION_LIMITS.scale.min, CHIBI_ARRANGEMENT_CORRECTION_LIMITS.scale.max)
    })) {
      fail(`${label}.nodes[${JSON.stringify(key)}].scale correction exceeds the allowed range.`)
    }
  }

  return override
}
