import * as THREE from 'three'

import type { ChibiArrangementNode } from './chibi-arrangement'

export function chibiFaceLayerKey(material: THREE.Material, hasRenderingProfile: boolean): '$eyes' | '$eyebrows' | null {
  const adapter = material.userData.chibi?.adapterId
  if (adapter === 'mx-character-eyemouth') return '$eyes'
  if (adapter === 'mx-character-eyebrow') return '$eyebrows'
  if (!hasRenderingProfile && /EyeMouth/i.test(material.name)) return '$eyes'
  if (!hasRenderingProfile && /Eyebrow/i.test(material.name)) return '$eyebrows'
  return null
}

export function captureChibiFaceLayer(material: THREE.Material) {
  const baseline = {
    depthTest: material.depthTest, depthFunc: material.depthFunc,
    polygonOffset: material.polygonOffset, polygonOffsetFactor: material.polygonOffsetFactor,
    polygonOffsetUnits: material.polygonOffsetUnits,
  }
  return (node: ChibiArrangementNode | undefined) => {
    material.depthTest = node?.depthTest ?? baseline.depthTest
    material.depthFunc = node?.depthTest === true ? THREE.LessEqualDepth : baseline.depthFunc
    const offset = node?.depthOffset ?? 0
    material.polygonOffset = baseline.polygonOffset || offset !== 0
    material.polygonOffsetFactor = baseline.polygonOffsetFactor + offset * 0.1
    material.polygonOffsetUnits = baseline.polygonOffsetUnits + offset
  }
}

function nodeMatrix(node: ChibiArrangementNode | undefined) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(node?.position?.[0] ?? 0, node?.position?.[1] ?? 0, node?.position?.[2] ?? 0),
    new THREE.Quaternion(node?.rotation?.[0] ?? 0, node?.rotation?.[1] ?? 0, node?.rotation?.[2] ?? 0, node?.rotation?.[3] ?? 1).normalize(),
    new THREE.Vector3(node?.scale?.[0] ?? 1, node?.scale?.[1] ?? 1, node?.scale?.[2] ?? 1),
  )
}

/** Return the parent-local correction that turns the imported node into its target. */
export function chibiArrangementCorrectionMatrix(baseline: ChibiArrangementNode | undefined, effective: ChibiArrangementNode | undefined) {
  const baseMatrix = nodeMatrix(baseline)
  const targetMatrix = nodeMatrix({ ...baseline, ...effective })
  return targetMatrix.multiply(baseMatrix.invert())
}

/** Preserve live source visibility unless the effective document differs from its imported default. */
export function chibiArrangementRendererVisibility(
  animatedVisible: boolean | undefined,
  effectiveVisible: boolean | undefined,
  baselineVisible: boolean | undefined,
  sourceVisible: boolean | undefined,
) {
  const defaultVisible = baselineVisible ?? sourceVisible
  if (typeof effectiveVisible === 'boolean' && typeof defaultVisible === 'boolean' && effectiveVisible !== defaultVisible) {
    return effectiveVisible
  }
  return animatedVisible ?? sourceVisible
}
