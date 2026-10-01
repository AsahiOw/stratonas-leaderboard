import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ACTION_LABELS,
  actionScreenshotPlan,
  availableProfileActions,
  browserSelectionMatchesStudent,
  extractCharacterDiagnostics,
  parseBrowserMode,
  parseGlbAnimationDurations,
  parseGlbJson,
  planBrowserRoster,
  resolveActionCaptureTiming,
  screenshotPlan,
  summarizeActionObservation,
} from './chibi-browser-harness.mjs'
import { runInNewContext } from 'node:vm'

const ref = objectId => ({ bundleSha256: 'A'.repeat(64), serializedFile: 'CAB-test', objectId: String(objectId) })

function validStudent(id, overrides = {}) {
  return {
    id,
    name: `Student ${id}`,
    status: 'viewable',
    model: {
      assetId: `asset-${id}`,
      revision: 'b'.repeat(64),
      url: `/assets/chibi/asset-${id}/revision.glb`,
      profile: {
        interactions: {
          idle: { state: 'available', clip: 'Idle' },
          walk: { state: 'available', clip: 'Walk' },
          pickup: { state: 'unsupported', reason: 'No authored pickup.' },
          touch: { state: 'available', clip: 'Touch' },
        },
      },
    },
    ...overrides,
  }
}

function makeGlb(json) {
  const encoded = new TextEncoder().encode(JSON.stringify(json))
  const jsonLength = Math.ceil(encoded.length / 4) * 4
  const bytes = new Uint8Array(12 + 8 + jsonLength)
  const view = new DataView(bytes.buffer)
  bytes.set(new TextEncoder().encode('glTF'), 0)
  view.setUint32(4, 2, true)
  view.setUint32(8, bytes.length, true)
  view.setUint32(12, jsonLength, true)
  view.setUint32(16, 0x4e4f534a, true)
  bytes.set(encoded, 20)
  for (let index = 20 + encoded.length; index < 20 + jsonLength; index += 1) bytes[index] = 0x20
  return bytes
}

function validDiagnosticsJson({ excludeEquipment = false } = {}) {
  const body = ref(1)
  const equipment = ref(2)
  const presentation = ref(3)
  const excluded = {
    name: 'FX_Helper', hierarchyPath: 'Root/FX_Helper', reasonCode: 'PRESENTATION_SHADER_OR_MATERIAL',
    sourceReference: excludeEquipment ? equipment : presentation, materials: [], evidence: ['exact source presentation branch'],
  }
  const profile = {
    policyVersion: 'chibi-rendering-policy-test',
    renderers: [{ name: 'Body', sourceReference: body }, ...(excludeEquipment ? [] : [{ name: 'Weapon', sourceReference: equipment }])],
    excludedRenderers: [excluded], excludedChildRendererEvents: [],
    validation: { valid: true, unresolved: [], excludedRenderers: [excluded], excludedChildRendererEvents: [] },
    assembly: { attachments: { equipmentRendererReferences: [equipment] } },
  }
  return { scenes: [{ extras: { chibi: { renderingProfile: profile, renderingProfileDiagnostics: { policyVersion: profile.policyVersion, intentionallyExcludedRenderers: profile.excludedRenderers.map(item => ({ ...item, status: 'intentionally-excluded' })), excludedChildRendererEvents: [], unprofiledGeometry: [] } } } }] }
}

test('browser mode and roster planning keep pilot permissive but full fail closed', () => {
  assert.equal(parseBrowserMode('pilot'), 'pilot')
  assert.equal(parseBrowserMode('full'), 'full')
  const rows = [validStudent(10002), { id: 10003, name: 'Blocked', status: 'unavailable', model: null }]
  const pilot = planBrowserRoster(rows, 'pilot')
  assert.deepEqual(pilot.students.map(row => row.id), [10002])
  assert.deepEqual(pilot.blocked.map(row => row.id), [10003])
  assert.throws(() => planBrowserRoster(rows, 'full'), /blocked catalog rows/)
})

test('browser selection predicate works after Puppeteer serialization without Node closures', () => {
  const selected = id => ({ querySelector: selector => selector === 'span.font-mono' ? { innerText: id } : null })
  const context = {
    URL,
    location: { href: 'http://127.0.0.1:3102/3D?student=10002' },
    document: { querySelector: selector => selector === '[aria-current="true"]' ? selected('10002') : null },
  }
  const serializedPredicate = `(${browserSelectionMatchesStudent.toString()})(10002)`
  assert.equal(runInNewContext(serializedPredicate, context), true)
  assert.equal(runInNewContext(`(${browserSelectionMatchesStudent.toString()})(10003)`, context), false)

  const overlappingIdContext = {
    ...context,
    document: { querySelector: selector => selector === '[aria-current="true"]' ? selected('100020') : null },
  }
  assert.equal(runInNewContext(serializedPredicate, overlappingIdContext), false)
})

test('available authored actions preserve labels and require exact clips', () => {
  const actions = availableProfileActions(validStudent(10002).model.profile)
  assert.deepEqual(actions.map(action => action.id), ['idle', 'walk', 'touch'])
  assert.deepEqual(actions.map(action => action.label), [ACTION_LABELS.idle, ACTION_LABELS.walk, ACTION_LABELS.touch])
  const broken = validStudent(10002).model.profile
  broken.interactions.walk = { state: 'available' }
  assert.throws(() => availableProfileActions(broken), /Available Chibi interaction walk has no authored clip/)
})

test('GLB JSON parser and policy diagnostics retain exclusions and equipment', () => {
  const json = validDiagnosticsJson()
  assert.deepEqual(parseGlbJson(makeGlb(json)), json)
  const diagnostics = extractCharacterDiagnostics(json)
  assert.equal(diagnostics.coreRendererCount, 2)
  assert.equal(diagnostics.excludedRenderers.length, 1)
  assert.equal(diagnostics.excludedRenderers[0].reasonCode, 'PRESENTATION_SHADER_OR_MATERIAL')
  assert.equal(diagnostics.equipment.references.length, 1)
  assert.deepEqual(diagnostics.equipment.missingReferences, [])
  assert.deepEqual(diagnostics.equipment.excludedReferences, [])
})

test('GLB animation durations and action capture timing stay source-evidenced', () => {
  const animationJson = {
    animations: [{ name: 'Pickup', samplers: [{ input: 0 }] }, { name: 'Touch', samplers: [{ input: 1 }] }],
    accessors: [{ type: 'SCALAR', count: 2, min: [0], max: [1.25] }, { type: 'SCALAR', count: 2, min: [0], max: [0.8] }],
  }
  assert.deepEqual(parseGlbAnimationDurations(makeGlb(animationJson)), { Pickup: 1.25, Touch: 0.8 })
  assert.deepEqual(resolveActionCaptureTiming({ id: 'pickup', hold: true, speed: 1 }, { clipDuration: 1.25 }), {
    mode: 'duration', phase: 'final-hold', waitMs: 1250, clipDurationSeconds: 1.25, speed: 1,
    source: 'GLB animation input duration',
  })
  assert.deepEqual(resolveActionCaptureTiming({ id: 'touch', hold: false, speed: 1 }, { clipDuration: 0.8 }), {
    mode: 'duration', phase: 'mid-clip', waitMs: 400, clipDurationSeconds: 0.8, speed: 1,
    source: 'GLB animation input duration',
  })
  assert.deepEqual(resolveActionCaptureTiming({ id: 'touch', hold: false, speed: 1 }), {
    mode: 'frames', phase: 'active-rendered-frame', waitFrames: 1,
    source: 'aria-pressed + requestAnimationFrame',
  })
  assert.throws(() => resolveActionCaptureTiming({ id: 'pickup', hold: true, speed: 1 }), /requires an authored clip duration/)
})

test('policy diagnostics reject an equipment renderer classified as presentation-only', () => {
  assert.throws(() => extractCharacterDiagnostics(validDiagnosticsJson({ excludeEquipment: true })), /omits exact core equipment renderer|excludes exact core equipment renderer/)
})

test('screenshot and settled-action helpers are deterministic', () => {
  const student = validStudent(10002, { name: 'Étoile / Test' })
  assert.deepEqual(screenshotPlan(student), {
    front: '10002-etoile-test-front.png',
    side: '10002-etoile-test-side.png',
    rotated: '10002-etoile-test-rotated.png',
  })
  assert.deepEqual(summarizeActionObservation('touch', { ready: true, canvas: true, error: null, activated: true, settled: true, clip: 'Touch' }), {
    action: 'touch', label: 'Touch', clip: 'Touch', settled: true,
  })
  assert.deepEqual(summarizeActionObservation('pickup', {
    ready: true, canvas: true, error: null, activated: true, settled: true, clip: 'Pickup',
    screenshot: { file: '10002-student-10002-pickup.png', path: 'C:/isolated/10002-student-10002-pickup.png' },
  }), {
    action: 'pickup', label: 'Pick up', clip: 'Pickup', settled: true,
    screenshot: { file: '10002-student-10002-pickup.png', path: 'C:/isolated/10002-student-10002-pickup.png' },
  })
})

test('action screenshot plans include only authored non-idle actions', () => {
  const student = validStudent(10002, { name: 'Étoile / Test' })
  student.model.profile.interactions.pickup = { state: 'available', clip: 'Pickup', hold: true }
  const actions = availableProfileActions(student.model.profile)
  const expected = {
    walk: '10002-etoile-test-walk.png',
    pickup: '10002-etoile-test-pickup.png',
    touch: '10002-etoile-test-touch.png',
  }
  assert.deepEqual(actionScreenshotPlan(student, actions), expected)
  assert.deepEqual(actionScreenshotPlan(student), expected)
  assert.deepEqual(actionScreenshotPlan(student, actions.filter(action => action.id === 'idle')), {})
  assert.throws(() => actionScreenshotPlan(student, [{ id: 'pickup', clip: 'Fake pickup' }]), /does not match its authored clip/)
})
