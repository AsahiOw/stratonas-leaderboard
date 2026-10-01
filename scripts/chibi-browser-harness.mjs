import assert from 'node:assert/strict'

export const PILOT_STUDENT_ID = 10002

/**
 * This predicate is serialized by Puppeteer into the browser context. Keep the
 * expected ID as an argument so it does not depend on a Node-side closure.
 */
export function browserSelectionMatchesStudent(studentId) {
  const selectedId = document.querySelector('[aria-current="true"]')
    ?.querySelector('span.font-mono')?.innerText.trim()
  return new URL(location.href).searchParams.get('student') === String(studentId)
    && selectedId === String(studentId)
}

/**
 * These labels are the public labels rendered by ChibiViewer.  Keeping the
 * action-to-label mapping in one place lets the browser runner address the
 * authored profile actions without relying on button order.
 */
export const ACTION_LABELS = Object.freeze({
  idle: 'Standing idle',
  walk: 'Walk',
  pickup: 'Pick up',
  touch: 'Touch',
})

export const ACTION_IDS = Object.freeze(Object.keys(ACTION_LABELS))

export const PRESENTATION_EXCLUSION_REASONS = Object.freeze(new Set([
  'PRESENTATION_SHADER_OR_MATERIAL',
  'PRESENTATION_MESH_10210_OR_HELPER',
]))

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function requireRecord(value, label) {
  assert.ok(isRecord(value), `${label} must be an object.`)
  return value
}

function referenceKey(value, label = 'source reference') {
  const reference = requireRecord(value, label)
  for (const field of ['bundleSha256', 'serializedFile', 'objectId']) {
    assert.ok(typeof reference[field] === 'string' && reference[field].trim(), `${label}.${field} must be a non-empty string.`)
  }
  return `${reference.bundleSha256.toLowerCase()}:${reference.serializedFile.toLowerCase()}:${reference.objectId}`
}

function dedupeReferences(values, label) {
  const result = []
  const seen = new Set()
  for (const value of values) {
    const key = referenceKey(value, label)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(value)
  }
  return result.sort((left, right) => referenceKey(left, label).localeCompare(referenceKey(right, label)))
}

export function parseBrowserMode(value = 'pilot') {
  assert.ok(value === 'pilot' || value === 'full', `Browser mode must be "pilot" or "full", got ${String(value)}.`)
  return value
}

function validateCatalogStudent(student, index) {
  requireRecord(student, `Catalog student ${index}`)
  assert.ok(Number.isInteger(student.id) && student.id >= 10000 && student.id <= 99999, `Catalog student ${index} has an invalid eligible id.`)
  assert.ok(typeof student.name === 'string' && student.name.trim(), `Catalog student ${student.id} has no name.`)
  assert.ok(student.model === null || isRecord(student.model), `Catalog student ${student.id} model must be an object or null.`)
  if (student.model) {
    assert.ok(typeof student.model.assetId === 'string' && student.model.assetId.trim(), `Catalog student ${student.id} model has no assetId.`)
    assert.ok(typeof student.model.revision === 'string' && student.model.revision.trim(), `Catalog student ${student.id} model has no revision.`)
    assert.ok(typeof student.model.url === 'string' && student.model.url.trim(), `Catalog student ${student.id} model has no URL.`)
    requireRecord(student.model.profile, `Catalog student ${student.id} model profile`)
  }
  return student
}

/**
 * Validate and select the browser roster.  Full mode is intentionally strict:
 * every eligible catalog row must be viewable.  Pilot mode retains the old
 * Haruna smoke fixture and may still inspect unavailable rows through the
 * legacy navigation checks.
 */
export function planBrowserRoster(students, mode = 'pilot', { pilotStudentId = PILOT_STUDENT_ID } = {}) {
  parseBrowserMode(mode)
  assert.ok(Array.isArray(students) && students.length > 0, 'The public Chibi catalog must contain at least one student.')
  const rows = students.map(validateCatalogStudent)
  const ids = new Set()
  for (const student of rows) {
    assert.ok(!ids.has(student.id), `The public Chibi catalog contains duplicate student ${student.id}.`)
    ids.add(student.id)
  }
  const blocked = rows.filter(student => student.status !== 'viewable' || !student.model)
  if (mode === 'full') {
    assert.deepEqual(blocked, [], `Full-roster browser acceptance found blocked catalog rows: ${blocked.map(student => `${student.id}:${student.status || 'unknown'}`).join(', ')}`)
    return { mode, students: rows, blocked: [] }
  }
  const pilot = rows.find(student => student.id === pilotStudentId)
  assert.ok(pilot, `Pilot catalog row ${pilotStudentId} is missing.`)
  return { mode, students: [pilot], blocked }
}

export function availableProfileActions(profile) {
  const record = requireRecord(profile, 'Chibi profile')
  const interactions = requireRecord(record.interactions, 'Chibi profile interactions')
  const actions = []
  for (const action of ACTION_IDS) {
    const interaction = requireRecord(interactions[action], `Chibi interaction ${action}`)
    if (interaction.state !== 'available') continue
    assert.ok(typeof interaction.clip === 'string' && interaction.clip.trim(), `Available Chibi interaction ${action} has no authored clip.`)
    actions.push({
      id: action,
      label: ACTION_LABELS[action],
      clip: interaction.clip,
      // ChibiViewer defaults idle/walk to LoopRepeat and pickup to a held
      // final pose when the source profile omits an explicit flag.
      loop: typeof interaction.loop === 'boolean' ? interaction.loop : action === 'idle' || action === 'walk',
      hold: typeof interaction.hold === 'boolean' ? interaction.hold : action === 'pickup',
      speed: interaction.speed,
    })
  }
  return actions
}

function screenshotSlug(student) {
  validateCatalogStudent(student, 'screenshot')
  const slug = `${student.id}-${student.name}`
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  assert.ok(slug, `Student ${student.id} has no stable screenshot slug.`)
  return slug
}

export function screenshotPlan(student) {
  const slug = screenshotSlug(student)
  return {
    front: `${slug}-front.png`,
    side: `${slug}-side.png`,
    rotated: `${slug}-rotated.png`,
  }
}

/**
 * Build action-frame filenames only for authored, available actions.  The
 * browser runner passes the already validated action records from
 * availableProfileActions, so unsupported interactions can never acquire a
 * screenshot filename by accident.
 */
export function actionScreenshotPlan(student, actions) {
  const slug = screenshotSlug(student)
  const selectedActions = actions ?? availableProfileActions(student.model.profile)
  assert.ok(Array.isArray(selectedActions), `Student ${student.id} action screenshot plan must be an array.`)
  const result = {}
  for (const action of selectedActions) {
    requireRecord(action, `Screenshot action for student ${student.id}`)
    assert.ok(ACTION_IDS.includes(action.id), `Unknown Chibi action ${String(action.id)} for student ${student.id}.`)
    if (action.id === 'idle') continue
    assert.ok(typeof action.clip === 'string' && action.clip.trim(), `Screenshot action ${action.id} for student ${student.id} has no authored clip.`)
    const authored = student.model?.profile?.interactions?.[action.id]
    assert.equal(authored?.state, 'available', `Screenshot action ${action.id} for student ${student.id} is not authored and available.`)
    assert.equal(authored.clip, action.clip, `Screenshot action ${action.id} for student ${student.id} does not match its authored clip.`)
    assert.equal(result[action.id], undefined, `Student ${student.id} has duplicate screenshot action ${action.id}.`)
    result[action.id] = `${slug}-${action.id}.png`
  }
  return result
}

function glbBytes(value) {
  if (value instanceof Uint8Array) return value
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
  throw new TypeError('GLB data must be an ArrayBuffer or Uint8Array.')
}

function parseGlbChunks(value) {
  const bytes = glbBytes(value)
  assert.ok(bytes.byteLength >= 20, 'GLB is too short.')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  assert.equal(new TextDecoder().decode(bytes.subarray(0, 4)), 'glTF', 'GLB magic is invalid.')
  assert.equal(view.getUint32(4, true), 2, 'GLB version must be 2.')
  assert.equal(view.getUint32(8, true), bytes.byteLength, 'GLB declared length differs from response length.')
  let offset = 12
  let jsonChunk = null
  let binaryChunk = null
  while (offset < bytes.byteLength) {
    assert.ok(offset + 8 <= bytes.byteLength, 'GLB chunk header is truncated.')
    const length = view.getUint32(offset, true)
    const type = view.getUint32(offset + 4, true)
    const end = offset + 8 + length
    assert.ok(length % 4 === 0 && end <= bytes.byteLength, 'GLB chunk bounds are invalid.')
    if (type === 0x4e4f534a) jsonChunk = new TextDecoder().decode(bytes.subarray(offset + 8, end)).trim()
    if (type === 0x004e4942) binaryChunk = bytes.subarray(offset + 8, end)
    offset = end
  }
  assert.ok(jsonChunk, 'GLB has no JSON chunk.')
  return { json: JSON.parse(jsonChunk), binary: binaryChunk }
}

/** Decode only the JSON chunk from a GLB.  This is intentionally dependency-free. */
export function parseGlbJson(value) {
  return parseGlbChunks(value).json
}

const ACCESSOR_COMPONENT_READERS = Object.freeze({
  5120: { bytes: 1, read: (view, offset) => view.getInt8(offset) },
  5121: { bytes: 1, read: (view, offset) => view.getUint8(offset) },
  5122: { bytes: 2, read: (view, offset) => view.getInt16(offset, true) },
  5123: { bytes: 2, read: (view, offset) => view.getUint16(offset, true) },
  5124: { bytes: 4, read: (view, offset) => view.getInt32(offset, true) },
  5125: { bytes: 4, read: (view, offset) => view.getUint32(offset, true) },
  5126: { bytes: 4, read: (view, offset) => view.getFloat32(offset, true) },
})

function accessorScalarMax(glbJson, binary, accessorIndex) {
  const accessor = glbJson.accessors?.[accessorIndex]
  if (!isRecord(accessor) || accessor.type !== 'SCALAR' || !Number.isInteger(accessor.count) || accessor.count < 1) return null
  if (Array.isArray(accessor.max) && Number.isFinite(accessor.max[0])) return accessor.max[0]
  if (!(binary instanceof Uint8Array)) return null
  const bufferView = glbJson.bufferViews?.[accessor.bufferView]
  const reader = ACCESSOR_COMPONENT_READERS[accessor.componentType]
  if (!isRecord(bufferView) || !reader) return null
  const start = (Number.isInteger(bufferView.byteOffset) ? bufferView.byteOffset : 0) + (Number.isInteger(accessor.byteOffset) ? accessor.byteOffset : 0)
  const stride = Number.isInteger(bufferView.byteStride) ? bufferView.byteStride : reader.bytes
  const end = start + stride * (accessor.count - 1) + reader.bytes
  if (start < 0 || end > binary.byteLength) return null
  const view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength)
  let maximum = -Infinity
  for (let index = 0; index < accessor.count; index += 1) maximum = Math.max(maximum, reader.read(view, start + index * stride))
  return Number.isFinite(maximum) ? maximum : null
}

/** Return source clip durations in seconds from glTF animation input accessors. */
export function parseGlbAnimationDurations(value) {
  const { json, binary } = parseGlbChunks(value)
  const durations = {}
  for (const animation of Array.isArray(json.animations) ? json.animations : []) {
    if (!isRecord(animation) || typeof animation.name !== 'string' || !animation.name.trim()) continue
    let duration = 0
    for (const sampler of Array.isArray(animation.samplers) ? animation.samplers : []) {
      if (!isRecord(sampler)) continue
      const maximum = accessorScalarMax(json, binary, sampler.input)
      if (maximum !== null) duration = Math.max(duration, maximum)
    }
    if (duration > 0) durations[animation.name] = duration
  }
  return durations
}

/** Resolve a truthful action-frame timing mode from authored/runtime evidence. */
export function resolveActionCaptureTiming(action, { profileDuration = null, clipDuration = null } = {}) {
  requireRecord(action, 'Action capture timing')
  assert.ok(ACTION_IDS.includes(action.id), `Unknown Chibi action ${String(action.id)}.`)
  if (action.id === 'idle') return { mode: 'none', phase: 'idle', waitFrames: 0, source: 'idle orientation capture' }
  const speed = Number.isFinite(action.speed) && action.speed > 0 ? action.speed : 1
  const authoredDuration = Number.isFinite(profileDuration) && profileDuration > 0
    ? { seconds: profileDuration, source: 'profile duration' }
    : Number.isFinite(clipDuration) && clipDuration > 0
      ? { seconds: clipDuration, source: 'GLB animation input duration' }
      : null
  if (action.id === 'pickup' && action.hold) {
    assert.ok(authoredDuration, 'Held pickup capture requires an authored clip duration.')
    return {
      mode: 'duration', phase: 'final-hold', waitMs: Math.ceil(authoredDuration.seconds * 1000 / speed),
      clipDurationSeconds: authoredDuration.seconds, speed, source: authoredDuration.source,
    }
  }
  if (action.id === 'touch' && authoredDuration) {
    const midpointMs = Math.floor(authoredDuration.seconds * 1000 / speed / 2)
    if (midpointMs >= 16) {
      return {
        mode: 'duration', phase: 'mid-clip', waitMs: midpointMs,
        clipDurationSeconds: authoredDuration.seconds, speed, source: authoredDuration.source,
      }
    }
  }
  return { mode: 'frames', phase: 'active-rendered-frame', waitFrames: action.id === 'touch' ? 1 : 2, source: 'aria-pressed + requestAnimationFrame' }
}

function sceneChibiExtras(glbJson) {
  requireRecord(glbJson, 'GLB JSON')
  const sceneIndex = Number.isInteger(glbJson.scene) ? glbJson.scene : 0
  const scene = glbJson.scenes?.[sceneIndex]
  const chibi = scene?.extras?.chibi
  assert.ok(isRecord(chibi), 'GLB scene has no Chibi extras.')
  return chibi
}

function attachmentReferences(attachments) {
  if (!isRecord(attachments)) return []
  return [
    ...(Array.isArray(attachments.equipmentRendererReferences) ? attachments.equipmentRendererReferences : []),
    ...(Array.isArray(attachments.mainWeaponRendererReferences) ? attachments.mainWeaponRendererReferences : []),
    ...(Array.isArray(attachments.subWeaponRendererReferences) ? attachments.subWeaponRendererReferences : []),
    ...(Array.isArray(attachments.weaponRendererReferences) ? attachments.weaponRendererReferences : []),
    ...(Array.isArray(attachments.accessoryRendererReferences) ? attachments.accessoryRendererReferences : []),
  ]
}

/**
 * Extract and validate the source-evidenced policy diagnostics embedded in a
 * published model.  Core equipment is checked against exact source identity;
 * name-only attachment data is never promoted to a core renderer here.
 */
export function extractCharacterDiagnostics(glbJson) {
  const chibi = sceneChibiExtras(glbJson)
  const profile = requireRecord(chibi.renderingProfile, 'GLB rendering profile')
  const diagnostics = requireRecord(chibi.renderingProfileDiagnostics, 'GLB rendering profile diagnostics')
  assert.ok(Array.isArray(profile.renderers), 'GLB rendering profile has no core renderer records.')
  assert.ok(Array.isArray(profile.excludedRenderers), 'GLB rendering profile has no exclusion records.')
  assert.ok(Array.isArray(profile.excludedChildRendererEvents), 'GLB rendering profile has no excluded event records.')
  assert.ok(Array.isArray(diagnostics.intentionallyExcludedRenderers), 'GLB policy diagnostics have no excluded renderer records.')
  assert.ok(Array.isArray(diagnostics.excludedChildRendererEvents), 'GLB policy diagnostics have no excluded event records.')
  assert.ok(Array.isArray(diagnostics.unprofiledGeometry), 'GLB policy diagnostics have no unprofiled-geometry record.')
  assert.deepEqual(diagnostics.unprofiledGeometry, [], 'GLB policy diagnostics contain unprofiled geometry.')
  assert.equal(diagnostics.policyVersion, profile.policyVersion, 'GLB policy diagnostic version differs from the embedded profile.')
  assert.deepEqual(profile.validation?.excludedRenderers ?? [], profile.excludedRenderers, 'GLB profile validation exclusion records do not match the profile.')
  assert.deepEqual(profile.validation?.excludedChildRendererEvents ?? [], profile.excludedChildRendererEvents, 'GLB profile validation event exclusions do not match the profile.')

  const excludedRenderers = profile.excludedRenderers.map((renderer, index) => {
    requireRecord(renderer, `Excluded renderer ${index}`)
    assert.ok(PRESENTATION_EXCLUSION_REASONS.has(renderer.reasonCode), `Excluded renderer ${index} has an unsupported reason code.`)
    const sourceReference = referenceKey(renderer.sourceReference, `Excluded renderer ${index}.sourceReference`)
    assert.ok(Array.isArray(renderer.evidence) && renderer.evidence.length > 0, `Excluded renderer ${index} has no source evidence.`)
    return { ...renderer, sourceReferenceKey: sourceReference }
  })
  const excludedKeys = new Set(excludedRenderers.map(renderer => renderer.sourceReferenceKey))
  assert.equal(excludedKeys.size, excludedRenderers.length, 'GLB has duplicate excluded renderer identities.')
  const diagnosticExcludedKeys = new Set(diagnostics.intentionallyExcludedRenderers.map((renderer, index) => {
    requireRecord(renderer, `Embedded excluded renderer diagnostic ${index}`)
    return referenceKey(renderer.sourceReference, `Embedded excluded renderer diagnostic ${index}.sourceReference`)
  }))
  assert.deepEqual(diagnosticExcludedKeys, excludedKeys, 'GLB exclusion diagnostics do not match the embedded profile.')
  assert.deepEqual(diagnostics.excludedChildRendererEvents, profile.excludedChildRendererEvents, 'GLB excluded-event diagnostics do not match the embedded profile.')
  const coreRenderers = profile.renderers.map((renderer, index) => {
    requireRecord(renderer, `Core renderer ${index}`)
    return { ...renderer, sourceReferenceKey: referenceKey(renderer.sourceReference, `Core renderer ${index}.sourceReference`) }
  })
  const coreKeys = new Set(coreRenderers.map(renderer => renderer.sourceReferenceKey))
  for (const key of excludedKeys) assert.ok(!coreKeys.has(key), `Renderer ${key} is both core and excluded.`)

  const attachments = profile.assembly?.attachments ?? {}
  const equipmentReferences = dedupeReferences(attachmentReferences(attachments), 'equipment source reference')
  const equipmentKeys = equipmentReferences.map(reference => referenceKey(reference, 'equipment source reference'))
  const equipmentMissing = equipmentKeys.filter(key => !coreKeys.has(key))
  const equipmentExcluded = equipmentKeys.filter(key => excludedKeys.has(key))
  const ambiguities = Array.isArray(attachments.equipmentRendererAmbiguities) ? attachments.equipmentRendererAmbiguities : []
  assert.deepEqual(equipmentMissing, [], `Published model omits exact core equipment renderer(s): ${equipmentMissing.join(', ')}`)
  assert.deepEqual(equipmentExcluded, [], `Published model excludes exact core equipment renderer(s): ${equipmentExcluded.join(', ')}`)
  assert.deepEqual(ambiguities, [], 'Published model retains unresolved equipment renderer ambiguities.')

  const unresolved = Array.isArray(profile.validation?.unresolved) ? profile.validation.unresolved : []
  assert.deepEqual(unresolved, [], `Published rendering profile has unresolved blockers: ${unresolved.join(' ')}`)
  assert.equal(profile.validation?.valid, true, 'Published rendering profile is not marked valid.')

  return {
    policyVersion: profile.policyVersion ?? diagnostics.policyVersion ?? null,
    coreRendererCount: coreRenderers.length,
    coreRendererReferences: coreRenderers.map(renderer => ({ name: renderer.name ?? null, hierarchyPath: renderer.hierarchyPath ?? null, sourceReference: renderer.sourceReference })),
    excludedRenderers: excludedRenderers.map(({ sourceReferenceKey: _key, ...renderer }) => renderer),
    excludedChildRendererEvents: profile.excludedChildRendererEvents,
    equipment: {
      references: equipmentReferences,
      includedReferences: equipmentKeys,
      missingReferences: equipmentMissing,
      excludedReferences: equipmentExcluded,
      ambiguities,
    },
  }
}

export function summarizeActionObservation(action, observation) {
  assert.ok(ACTION_IDS.includes(action), `Unknown Chibi action ${action}.`)
  requireRecord(observation, `Observation for ${action}`)
  assert.equal(observation.ready, true, `${action} observation did not report model readiness.`)
  assert.equal(observation.canvas, true, `${action} observation did not report a model canvas.`)
  assert.equal(observation.error, null, `${action} observation reported a viewer error.`)
  assert.equal(observation.activated, true, `${action} did not become active after being clicked.`)
  assert.equal(observation.settled, true, `${action} did not settle after its transition.`)
  const summary = { action, label: ACTION_LABELS[action], clip: observation.clip ?? null, settled: true }
  if (observation.screenshot !== undefined) summary.screenshot = observation.screenshot
  return summary
}
