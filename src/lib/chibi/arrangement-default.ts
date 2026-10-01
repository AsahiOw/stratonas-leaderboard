import * as THREE from 'three'

import {
  buildChibiArrangementAllowedNodes,
  CHIBI_ARRANGEMENT_SCHEMA_VERSION,
  parseChibiArrangementDelta,
  type ChibiArrangementDelta,
  type ChibiArrangementNodeDelta,
} from './arrangement'
import { sourceObjectKey } from './rendering-profile'

type GlbNode = {
  translation?: unknown
  rotation?: unknown
  scale?: unknown
  matrix?: unknown
}

type SourceReference = Parameters<typeof sourceObjectKey>[0]

type RenderingProfileWithBindings = {
  renderers: {
    sourceReference: SourceReference
    defaultVisible: boolean
    glbNodeIndex: number | null
  }[]
  equipmentBindingEvidence?: unknown[]
  warnings?: unknown[]
}

function finiteArray(value: unknown, length: number, label: string) {
  if (!Array.isArray(value) || value.length !== length || value.some(item => typeof item !== 'number' || !Number.isFinite(item))) {
    throw new Error(`${label} must contain ${length} finite numbers.`)
  }
  return value as number[]
}

function nodeTransform(node: GlbNode, label: string) {
  const matrix = new THREE.Matrix4()
  if (node.matrix !== undefined) {
    matrix.fromArray(finiteArray(node.matrix, 16, `${label}.matrix`))
  } else {
    const position = new THREE.Vector3(...finiteArray(node.translation ?? [0, 0, 0], 3, `${label}.translation`) as [number, number, number])
    const rotation = new THREE.Quaternion(...finiteArray(node.rotation ?? [0, 0, 0, 1], 4, `${label}.rotation`) as [number, number, number, number])
    const scale = new THREE.Vector3(...finiteArray(node.scale ?? [1, 1, 1], 3, `${label}.scale`) as [number, number, number])
    matrix.compose(position, rotation.normalize(), scale)
  }

  const position = new THREE.Vector3()
  const rotation = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  matrix.decompose(position, rotation, scale)
  if (![...position.toArray(), ...rotation.toArray(), ...scale.toArray()].every(Number.isFinite)
    || scale.toArray().some(value => Math.abs(value) < 1e-8)) {
    throw new Error(`${label} has a non-invertible or non-finite transform.`)
  }
  return {
    position: position.toArray() as [number, number, number],
    rotation: rotation.normalize().toArray() as [number, number, number, number],
    scale: scale.toArray() as [number, number, number],
  }
}

function arrangementMatrix(node: ChibiArrangementNodeDelta | undefined) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...(node?.position ?? [0, 0, 0]) as [number, number, number]),
    new THREE.Quaternion(...(node?.rotation ?? [0, 0, 0, 1]) as [number, number, number, number]).normalize(),
    new THREE.Vector3(...(node?.scale ?? [1, 1, 1]) as [number, number, number]),
  )
}

function transformFromMatrix(matrix: THREE.Matrix4) {
  const position = new THREE.Vector3()
  const rotation = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  matrix.decompose(position, rotation, scale)
  if (![...position.toArray(), ...rotation.toArray(), ...scale.toArray()].every(Number.isFinite)
    || scale.toArray().some(value => Math.abs(value) < 1e-8)) {
    throw new Error('Rebased arrangement transform is non-invertible or non-finite.')
  }
  return {
    position: position.toArray() as [number, number, number],
    rotation: rotation.normalize().toArray() as [number, number, number, number],
    scale: scale.toArray() as [number, number, number],
  }
}

function differs(left: readonly number[], right: readonly number[]) {
  return left.some((value, index) => Math.abs(value - right[index]) > 1e-8)
}

/**
 * Snapshot the final imported GLB transforms for the exact nodes the admin
 * adjustment allowlist can edit. The GLB keeps these transforms; the viewer
 * applies later edits as wrapper corrections relative to this snapshot.
 */
export function buildChibiArrangementDefault(profileValue: unknown, glbNodesValue: unknown): ChibiArrangementDelta {
  if (!profileValue || typeof profileValue !== 'object' || Array.isArray(profileValue)) {
    throw new Error('The imported rendering profile is invalid.')
  }
  if (!Array.isArray(glbNodesValue)) throw new Error('The imported GLB has no node array.')
  const profile = profileValue as RenderingProfileWithBindings
  if (!Array.isArray(profile.renderers)) throw new Error('The imported rendering profile has no renderer array.')

  const nodes: Record<string, { visible: boolean; position: [number, number, number]; rotation: [number, number, number, number]; scale: [number, number, number] }> = {
    '$model': { visible: true, position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
  }
  const allowed = buildChibiArrangementAllowedNodes(profile)
  for (const allowedNode of allowed) {
    if (allowedNode.kind !== 'equipment') continue
    const matches = profile.renderers.filter(renderer => renderer.sourceReference && sourceObjectKey(renderer.sourceReference) === allowedNode.key)
    if (matches.length !== 1) throw new Error(`Imported arrangement node ${allowedNode.key} maps to ${matches.length} exact rendering-profile entries.`)
    const renderer = matches[0]
    const nodeIndex = renderer.glbNodeIndex
    if (!Number.isInteger(nodeIndex) || nodeIndex! < 0 || nodeIndex! >= glbNodesValue.length) {
      throw new Error(`Imported arrangement node ${allowedNode.key} has no exact GLB node binding.`)
    }
    nodes[allowedNode.key] = {
      ...nodeTransform(glbNodesValue[nodeIndex!] as GlbNode, `GLB node ${nodeIndex}`),
      visible: renderer.defaultVisible,
    }
  }

  return { schemaVersion: CHIBI_ARRANGEMENT_SCHEMA_VERSION, nodes }
}

export function isCompleteChibiArrangementDefault(value: unknown, validation: unknown) {
  try {
    const baseline = parseChibiArrangementDelta(value, 'arrangementDefault')
    const allowedKeys = new Set(buildChibiArrangementAllowedNodes(validation).filter(node => node.kind !== 'face-layer').map(node => node.key))
    const hasCompleteNode = (key: string) => {
      const node = baseline.nodes[key]
      return !!node
        && typeof node.visible === 'boolean'
        && node.position?.length === 3
        && node.rotation?.length === 4
        && node.scale?.length === 3
    }
    return [...allowedKeys].every(hasCompleteNode)
      && Object.keys(baseline.nodes).every(key => allowedKeys.has(key))
  } catch {
    return false
  }
}

/**
 * Carry an old binding's transform corrections onto a new imported baseline.
 * Binding values are sparse absolute targets, so first recover their matrix
 * correction from the prior immutable default and compose it onto the new
 * baseline. This also converts legacy wrapper deltas whose old default was
 * empty. Keys removed from the new revision are discarded with their edits.
 */
export function rebaseChibiArrangementOverride(
  oldDefaultValue: unknown,
  oldOverrideValue: unknown,
  newDefaultValue: unknown,
): ChibiArrangementDelta {
  const oldDefault = parseChibiArrangementDelta(oldDefaultValue ?? {}, 'previous arrangementDefault')
  const oldOverride = parseChibiArrangementDelta(oldOverrideValue ?? {}, 'arrangementOverride')
  const nextDefault = parseChibiArrangementDelta(newDefaultValue, 'arrangementDefault')
  const nodes: Record<string, ChibiArrangementNodeDelta> = {}

  for (const [key, override] of Object.entries(oldOverride.nodes)) {
    if (key === '$eyes' || key === '$eyebrows') {
      nodes[key] = { ...override }
      continue
    }
    const baseline = nextDefault.nodes[key]
    if (!baseline) continue
    const previousBaseline = oldDefault.nodes[key]
    const previousEffective = { ...(previousBaseline ?? {}), ...override }
    const correction = arrangementMatrix(previousEffective)
      .multiply(arrangementMatrix(previousBaseline).invert())
    const nextEffective = transformFromMatrix(correction.multiply(arrangementMatrix(baseline)))
    const rebased: ChibiArrangementNodeDelta = {}
    if (differs(nextEffective.position, baseline.position ?? [0, 0, 0])) rebased.position = nextEffective.position
    if (differs(nextEffective.rotation, baseline.rotation ?? [0, 0, 0, 1])) rebased.rotation = nextEffective.rotation
    if (differs(nextEffective.scale, baseline.scale ?? [1, 1, 1])) rebased.scale = nextEffective.scale
    if (typeof override.visible === 'boolean' && override.visible !== baseline.visible) rebased.visible = override.visible
    if (Object.keys(rebased).length) nodes[key] = rebased
  }

  return { schemaVersion: CHIBI_ARRANGEMENT_SCHEMA_VERSION, nodes }
}
