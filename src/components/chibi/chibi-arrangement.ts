/**
 * Client-side arrangement contract for the admin preview.
 *
 * The server owns validation and persistence.  This module only describes the
 * small, serializable document exchanged with the guarded admin endpoints so
 * the viewer can preview a delta without changing the published GLB.
 */

export const CHIBI_ARRANGEMENT_SCHEMA_VERSION = 1 as const
export const CHIBI_MODEL_NODE_KEY = '$model' as const

export type ChibiArrangementVector3 = readonly [number, number, number]
export type ChibiArrangementQuaternion = readonly [number, number, number, number]

export interface ChibiArrangementNode {
  depthTest?: boolean
  depthOffset?: number
  visible?: boolean
  position?: ChibiArrangementVector3
  rotation?: ChibiArrangementQuaternion
  scale?: ChibiArrangementVector3
}

export interface ChibiArrangementDocument {
  schemaVersion: typeof CHIBI_ARRANGEMENT_SCHEMA_VERSION
  nodes: Record<string, ChibiArrangementNode>
}

export interface ChibiArrangementAllowedNode {
  key: string
  kind: 'model' | 'equipment' | 'face-layer'
  label: string
}

export interface ChibiArrangementRecord {
  assetId: string
  checksum: string
  arrangementDefault: ChibiArrangementDocument
  effectiveArrangement: ChibiArrangementDocument
  allowedNodes: readonly ChibiArrangementAllowedNode[]
}

export interface ChibiArrangementSavePayload {
  schemaVersion: typeof CHIBI_ARRANGEMENT_SCHEMA_VERSION
  assetId: string
  checksum: string
  override: ChibiArrangementDocument
}

export interface ChibiVisibilitySavePayload {
  schemaVersion: typeof CHIBI_ARRANGEMENT_SCHEMA_VERSION
  assetId: string
  checksum: string
  catalogVisible: boolean
}

export interface ChibiArrangementTransform {
  position: [number, number, number]
  /** UI uses degrees; the wire contract uses a quaternion. */
  rotation: [number, number, number]
  scale: [number, number, number]
}

export const CHIBI_ARRANGEMENT_LIMITS = {
  position: { min: -0.5, max: 0.5, step: 0.01 },
  rotation: { min: -45, max: 45, step: 1 },
  scale: { min: 0.75, max: 1.25, step: 0.01 },
} as const

const identityTransform = (): ChibiArrangementTransform => ({
  position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
})

export function identityChibiArrangement(): ChibiArrangementDocument {
  return { schemaVersion: CHIBI_ARRANGEMENT_SCHEMA_VERSION, nodes: {} }
}

export function cloneChibiArrangement(document: ChibiArrangementDocument): ChibiArrangementDocument {
  return {
    schemaVersion: CHIBI_ARRANGEMENT_SCHEMA_VERSION,
    nodes: Object.fromEntries(Object.entries(document.nodes).map(([key, node]) => [key, {
      ...(typeof node.depthTest === 'boolean' ? { depthTest: node.depthTest } : {}),
      ...(typeof node.depthOffset === 'number' ? { depthOffset: node.depthOffset } : {}),
      ...(typeof node.visible === 'boolean' ? { visible: node.visible } : {}),
      ...(node.position ? { position: [...node.position] as ChibiArrangementVector3 } : {}),
      ...(node.rotation ? { rotation: [...node.rotation] as ChibiArrangementQuaternion } : {}),
      ...(node.scale ? { scale: [...node.scale] as ChibiArrangementVector3 } : {}),
    }])),
  }
}

export function mergeChibiArrangementDocuments(base: ChibiArrangementDocument, override: ChibiArrangementDocument): ChibiArrangementDocument {
  const nodes: Record<string, ChibiArrangementNode> = Object.fromEntries(
    Object.entries(base.nodes).map(([key, node]) => [key, { ...node }]),
  )
  for (const [key, node] of Object.entries(override.nodes)) nodes[key] = { ...(nodes[key] ?? {}), ...node }
  return { schemaVersion: CHIBI_ARRANGEMENT_SCHEMA_VERSION, nodes }
}

function finite(value: number | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function eulerToQuaternion(rotation: readonly [number, number, number]): ChibiArrangementQuaternion {
  const [x, y, z] = rotation.map(value => value * Math.PI / 180)
  const cx = Math.cos(x / 2), sx = Math.sin(x / 2)
  const cy = Math.cos(y / 2), sy = Math.sin(y / 2)
  const cz = Math.cos(z / 2), sz = Math.sin(z / 2)
  return [sx * cy * cz - cx * sy * sz, cx * sy * cz + sx * cy * sz, cx * cy * sz - sx * sy * cz, cx * cy * cz + sx * sy * sz]
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

function rawNodeTransform(node: ChibiArrangementNode | undefined) {
  const position: [number, number, number] = [
    finite(node?.position?.[0], 0), finite(node?.position?.[1], 0), finite(node?.position?.[2], 0),
  ]
  const rotation = normalizedQuaternion([
    finite(node?.rotation?.[0], 0), finite(node?.rotation?.[1], 0), finite(node?.rotation?.[2], 0), finite(node?.rotation?.[3], 1),
  ])
  const scale: [number, number, number] = [
    finite(node?.scale?.[0], 1), finite(node?.scale?.[1], 1), finite(node?.scale?.[2], 1),
  ]
  return { position, rotation, scale }
}

export function transformFromNode(node: ChibiArrangementNode | undefined): ChibiArrangementTransform {
  const fallback = identityTransform()
  const rotation = node?.rotation && node.rotation.length === 4
    ? quaternionToEuler([
      finite(node.rotation[0], 0), finite(node.rotation[1], 0), finite(node.rotation[2], 0), finite(node.rotation[3], 1),
    ])
    : fallback.rotation
  return {
    position: [
      clamp(finite(node?.position?.[0], 0), CHIBI_ARRANGEMENT_LIMITS.position.min, CHIBI_ARRANGEMENT_LIMITS.position.max),
      clamp(finite(node?.position?.[1], 0), CHIBI_ARRANGEMENT_LIMITS.position.min, CHIBI_ARRANGEMENT_LIMITS.position.max),
      clamp(finite(node?.position?.[2], 0), CHIBI_ARRANGEMENT_LIMITS.position.min, CHIBI_ARRANGEMENT_LIMITS.position.max),
    ],
    rotation: [
      clamp(finite(rotation[0], 0), CHIBI_ARRANGEMENT_LIMITS.rotation.min, CHIBI_ARRANGEMENT_LIMITS.rotation.max),
      clamp(finite(rotation[1], 0), CHIBI_ARRANGEMENT_LIMITS.rotation.min, CHIBI_ARRANGEMENT_LIMITS.rotation.max),
      clamp(finite(rotation[2], 0), CHIBI_ARRANGEMENT_LIMITS.rotation.min, CHIBI_ARRANGEMENT_LIMITS.rotation.max),
    ],
    scale: [
      clamp(finite(node?.scale?.[0], 1), CHIBI_ARRANGEMENT_LIMITS.scale.min, CHIBI_ARRANGEMENT_LIMITS.scale.max),
      clamp(finite(node?.scale?.[1], 1), CHIBI_ARRANGEMENT_LIMITS.scale.min, CHIBI_ARRANGEMENT_LIMITS.scale.max),
      clamp(finite(node?.scale?.[2], 1), CHIBI_ARRANGEMENT_LIMITS.scale.min, CHIBI_ARRANGEMENT_LIMITS.scale.max),
    ],
  }
}

export function transformToNode(transform: ChibiArrangementTransform): ChibiArrangementNode {
  const position: ChibiArrangementVector3 = [
    clamp(finite(transform.position[0], 0), CHIBI_ARRANGEMENT_LIMITS.position.min, CHIBI_ARRANGEMENT_LIMITS.position.max),
    clamp(finite(transform.position[1], 0), CHIBI_ARRANGEMENT_LIMITS.position.min, CHIBI_ARRANGEMENT_LIMITS.position.max),
    clamp(finite(transform.position[2], 0), CHIBI_ARRANGEMENT_LIMITS.position.min, CHIBI_ARRANGEMENT_LIMITS.position.max),
  ]
  const rotation: ChibiArrangementQuaternion = eulerToQuaternion([
    clamp(finite(transform.rotation[0], 0), CHIBI_ARRANGEMENT_LIMITS.rotation.min, CHIBI_ARRANGEMENT_LIMITS.rotation.max),
    clamp(finite(transform.rotation[1], 0), CHIBI_ARRANGEMENT_LIMITS.rotation.min, CHIBI_ARRANGEMENT_LIMITS.rotation.max),
    clamp(finite(transform.rotation[2], 0), CHIBI_ARRANGEMENT_LIMITS.rotation.min, CHIBI_ARRANGEMENT_LIMITS.rotation.max),
  ])
  const scale: ChibiArrangementVector3 = [
    clamp(finite(transform.scale[0], 1), CHIBI_ARRANGEMENT_LIMITS.scale.min, CHIBI_ARRANGEMENT_LIMITS.scale.max),
    clamp(finite(transform.scale[1], 1), CHIBI_ARRANGEMENT_LIMITS.scale.min, CHIBI_ARRANGEMENT_LIMITS.scale.max),
    clamp(finite(transform.scale[2], 1), CHIBI_ARRANGEMENT_LIMITS.scale.min, CHIBI_ARRANGEMENT_LIMITS.scale.max),
  ]
  return { position, rotation, scale }
}

export function setChibiArrangementTransform(document: ChibiArrangementDocument, key: string, transform: ChibiArrangementTransform): ChibiArrangementDocument {
  const next = cloneChibiArrangement(document)
  next.nodes[key] = {
    ...(typeof next.nodes[key]?.visible === 'boolean' ? { visible: next.nodes[key].visible } : {}),
    ...transformToNode(transform),
  }
  return next
}

/** Apply a bounded admin correction to the absolute imported baseline. */
export function setChibiArrangementAdjustment(
  document: ChibiArrangementDocument,
  key: string,
  baseline: ChibiArrangementNode | undefined,
  adjustment: ChibiArrangementTransform,
): ChibiArrangementDocument {
  const next = cloneChibiArrangement(document)
  const base = rawNodeTransform(baseline)
  const correction = transformToNode(adjustment)
  const position: ChibiArrangementVector3 = [
    base.position[0] + correction.position![0],
    base.position[1] + correction.position![1],
    base.position[2] + correction.position![2],
  ]
  const rotation = multiplyQuaternion(correction.rotation!, base.rotation)
  const scale: ChibiArrangementVector3 = [
    base.scale[0] * correction.scale![0],
    base.scale[1] * correction.scale![1],
    base.scale[2] * correction.scale![2],
  ]
  next.nodes[key] = {
    ...(typeof next.nodes[key]?.visible === 'boolean' ? { visible: next.nodes[key].visible } : {}),
    position, rotation, scale,
  }
  return next
}

/** Display the bounded correction from the imported baseline to the current target. */
export function arrangementAdjustmentTransform(
  baseline: ChibiArrangementNode | undefined,
  effective: ChibiArrangementNode | undefined,
): ChibiArrangementTransform {
  const base = rawNodeTransform(baseline)
  const target = rawNodeTransform(effective ?? baseline)
  const inverseBase: ChibiArrangementQuaternion = [-base.rotation[0], -base.rotation[1], -base.rotation[2], base.rotation[3]]
  const deltaRotation = quaternionToEuler(multiplyQuaternion(target.rotation, inverseBase))
  return {
    position: [
      clamp(target.position[0] - base.position[0], CHIBI_ARRANGEMENT_LIMITS.position.min, CHIBI_ARRANGEMENT_LIMITS.position.max),
      clamp(target.position[1] - base.position[1], CHIBI_ARRANGEMENT_LIMITS.position.min, CHIBI_ARRANGEMENT_LIMITS.position.max),
      clamp(target.position[2] - base.position[2], CHIBI_ARRANGEMENT_LIMITS.position.min, CHIBI_ARRANGEMENT_LIMITS.position.max),
    ],
    rotation: [
      clamp(deltaRotation[0], CHIBI_ARRANGEMENT_LIMITS.rotation.min, CHIBI_ARRANGEMENT_LIMITS.rotation.max),
      clamp(deltaRotation[1], CHIBI_ARRANGEMENT_LIMITS.rotation.min, CHIBI_ARRANGEMENT_LIMITS.rotation.max),
      clamp(deltaRotation[2], CHIBI_ARRANGEMENT_LIMITS.rotation.min, CHIBI_ARRANGEMENT_LIMITS.rotation.max),
    ],
    scale: [
      clamp(base.scale[0] === 0 ? 1 : target.scale[0] / base.scale[0], CHIBI_ARRANGEMENT_LIMITS.scale.min, CHIBI_ARRANGEMENT_LIMITS.scale.max),
      clamp(base.scale[1] === 0 ? 1 : target.scale[1] / base.scale[1], CHIBI_ARRANGEMENT_LIMITS.scale.min, CHIBI_ARRANGEMENT_LIMITS.scale.max),
      clamp(base.scale[2] === 0 ? 1 : target.scale[2] / base.scale[2], CHIBI_ARRANGEMENT_LIMITS.scale.min, CHIBI_ARRANGEMENT_LIMITS.scale.max),
    ],
  }
}

export function setChibiArrangementVisibility(document: ChibiArrangementDocument, key: string, visible: boolean): ChibiArrangementDocument {
  const next = cloneChibiArrangement(document)
  next.nodes[key] = { ...next.nodes[key], visible }
  return next
}

function equalArrangementValue(left: unknown, right: unknown) {
  if (Array.isArray(left) && Array.isArray(right)) return left.length === right.length && left.every((value, index) => value === right[index])
  return left === right
}

/**
 * Persist only the admin delta.  The viewer edits the effective arrangement,
 * while the database must keep the imported default immutable and separate.
 */
export function diffChibiArrangement(base: ChibiArrangementDocument, effective: ChibiArrangementDocument): ChibiArrangementDocument {
  const nodes: Record<string, ChibiArrangementNode> = {}
  for (const key of Object.keys(effective.nodes)) {
    const next = effective.nodes[key], original = base.nodes[key]
    const delta: ChibiArrangementNode = {}
    for (const field of ['visible', 'position', 'rotation', 'scale', 'depthTest', 'depthOffset'] as const) {
      if (field in next && !equalArrangementValue(next[field], original?.[field])) delta[field] = next[field] as never
    }
    if (Object.keys(delta).length) nodes[key] = delta
  }
  return { schemaVersion: CHIBI_ARRANGEMENT_SCHEMA_VERSION, nodes }
}

export function arrangementSavePayload(record: Pick<ChibiArrangementRecord, 'assetId' | 'checksum'>, override: ChibiArrangementDocument): ChibiArrangementSavePayload {
  return {
    schemaVersion: CHIBI_ARRANGEMENT_SCHEMA_VERSION,
    assetId: record.assetId,
    checksum: record.checksum,
    override: cloneChibiArrangement(override),
  }
}

export function visibilitySavePayload(record: Pick<ChibiArrangementRecord, 'assetId' | 'checksum'>, catalogVisible: boolean): ChibiVisibilitySavePayload {
  return { schemaVersion: CHIBI_ARRANGEMENT_SCHEMA_VERSION, assetId: record.assetId, checksum: record.checksum, catalogVisible }
}

export function arrangementRevisionMatches(record: Pick<ChibiArrangementRecord, 'assetId' | 'checksum'>, assetId: string, checksum: string) {
  return record.assetId === assetId && record.checksum === checksum
}

export function arrangementNodeTransform(document: ChibiArrangementDocument, key: string) {
  return transformFromNode(document.nodes[key])
}
