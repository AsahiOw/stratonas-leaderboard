import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertTargetRow,
  assertExpectedCompletedImportJob,
  assertNonAdminCatalogPage,
  assertNonAdminCatalogObservation,
  assertSavedArrangementOverride,
  chooseChangedOffset,
  equipmentAdjustmentTargetOption,
  expectedArrangementOffsetSave,
  loginFormIsHydrated,
  originalSettings,
  readAcceptanceConfig,
  restoreOriginalArrangementPayload,
  selectExactEquipmentNode,
} from './test-chibi-admin-adjustment'

const checksum = 'a'.repeat(64)
const misakiChecksum = 'b'.repeat(64)
const misakiArrangementKey = 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29:cab-28951afa2d0662740094a0cdb63635f7:-7191168882773665943'

function validEnv(): NodeJS.ProcessEnv {
  const databaseUrl = 'postgresql://test:test@localhost:5432/chibi-acceptance-admin-adjustment'
  return {
    NODE_ENV: 'test',
    CHIBI_TEST_ISOLATED: 'true',
    CHIBI_ACCEPTANCE_RUN: 'true',
    MAINTENANCE_SCHEDULER: 'disabled',
    CHIBI_ADMIN_ACCEPTANCE_ORIGIN: 'http://127.0.0.1:3118',
    CHIBI_ADMIN_ACCEPTANCE_STUDENT_ID: '10002',
    CHIBI_ADMIN_ACCEPTANCE_ASSET_ID: 'asset-10002',
    CHIBI_ADMIN_ACCEPTANCE_CHECKSUM: checksum,
    CHIBI_ADMIN_ACCEPTANCE_ADMIN_EMAIL: 'admin@example.invalid',
    CHIBI_ADMIN_ACCEPTANCE_ADMIN_PASSWORD: 'admin-test-secret',
    CHIBI_ADMIN_ACCEPTANCE_NONADMIN_EMAIL: 'member@example.invalid',
    CHIBI_ADMIN_ACCEPTANCE_NONADMIN_PASSWORD: 'member-test-secret',
    DATABASE_URL: databaseUrl,
    CHIBI_TEST_DATABASE_URL: databaseUrl,
  }
}

function targetRow() {
  const model = { position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] }
  const arrangement = { schemaVersion: 1, nodes: { $model: model } }
  return {
    id: 10002,
    pathName: 'ch0001',
    catalogVisible: true,
    arrangement: {
      assetId: 'asset-10002', checksum, arrangementDefault: arrangement, effectiveArrangement: arrangement,
    },
    chibiBinding: {
      status: 'available', identityPath: 'CH0001', arrangementOverride: {},
      asset: { id: 'asset-10002', checksum, published: true, validation: { valid: true } },
    },
  }
}

function misakiTargetRow() {
  const row = targetRow()
  const model = (row.arrangement.arrangementDefault as Record<string, any>).nodes.$model
  const weapon = { position: [0.2, 1.4, 0.3], rotation: [0, 0, 0, 1], scale: [1, 1, 1] }
  const nodes = { $model: model, [misakiArrangementKey]: weapon }
  return {
    ...row,
    id: 20049,
    pathName: 'misaki_swimsuit',
    arrangement: {
      ...row.arrangement,
      assetId: 'misaki-asset',
      checksum: misakiChecksum,
      arrangementDefault: { schemaVersion: 1, nodes },
      effectiveArrangement: { schemaVersion: 1, nodes },
      allowedNodes: [
        { key: '$model', kind: 'model', label: 'Model' },
        { key: misakiArrangementKey, kind: 'equipment', label: 'Cafe_CH0268/CH0268_Weapon' },
      ],
    },
    chibiBinding: {
      ...row.chibiBinding,
      identityPath: 'misaki_swimsuit',
      sourceIdentity: 'ch0268',
      asset: { ...(row.chibiBinding as Record<string, any>).asset, id: 'misaki-asset', checksum: misakiChecksum, sourceIdentity: 'ch0268' },
    },
  }
}

test('admin adjustment acceptance requires explicit isolated target, identities, and both accounts', () => {
  const config = readAcceptanceConfig(['--run'], validEnv())
  assert.deepEqual({ origin: config.origin, studentId: config.studentId, assetId: config.assetId, checksum: config.checksum }, {
    origin: 'http://127.0.0.1:3118', studentId: 10002, assetId: 'asset-10002', checksum,
  })
  assert.equal(config.equipmentNode, null, 'The legacy whole-model path must remain the default.')
  assert.equal(config.completedImportJobId, null, 'The strict v12 import-job pin must remain opt-in.')
  assert.throws(() => readAcceptanceConfig([], validEnv()), /Pass --run/)
  assert.throws(() => readAcceptanceConfig(['--run'], { ...validEnv(), CHIBI_TEST_ISOLATED: 'false' }), /CHIBI_TEST_ISOLATED/)
  assert.throws(() => readAcceptanceConfig(['--run'], { ...validEnv(), CHIBI_ADMIN_ACCEPTANCE_ORIGIN: 'https://example.com' }), /local HTTP/)
  assert.throws(() => readAcceptanceConfig(['--run'], { ...validEnv(), CHIBI_ADMIN_ACCEPTANCE_ORIGIN: 'http://example.com' }), /localhost/)
  assert.throws(() => readAcceptanceConfig(['--run'], { ...validEnv(), CHIBI_ADMIN_ACCEPTANCE_STUDENT_ID: '1002' }), /five-digit/)
  assert.throws(() => readAcceptanceConfig(['--run'], { ...validEnv(), CHIBI_ADMIN_ACCEPTANCE_CHECKSUM: 'bad' }), /SHA-256/)
  assert.throws(() => readAcceptanceConfig(['--run'], { ...validEnv(), CHIBI_ADMIN_ACCEPTANCE_NONADMIN_EMAIL: 'ADMIN@example.invalid' }), /must be different/)
})

test('v12 acceptance opt-in requires its exact completed import and a pinned Misaki revision', () => {
  const args = ['--run', '--equipment-key', 'CH0268_Weapon', '--equipment-revision', misakiChecksum, '--completed-import-job-id', 'cmug1gz1u0000hgkpxt74ocrt']
  const environment = {
    ...validEnv(),
    CHIBI_ADMIN_ACCEPTANCE_STUDENT_ID: '20049',
    CHIBI_ADMIN_ACCEPTANCE_ASSET_ID: 'misaki-asset',
    CHIBI_ADMIN_ACCEPTANCE_CHECKSUM: misakiChecksum,
  }
  assert.equal(readAcceptanceConfig(args, environment).completedImportJobId, 'cmug1gz1u0000hgkpxt74ocrt')
  assert.throws(() => readAcceptanceConfig([...args.slice(0, -1), 'another-job-id'], environment), /pinned v12 import job/)
  assert.throws(() => readAcceptanceConfig(['--run', '--completed-import-job-id', 'cmug1gz1u0000hgkpxt74ocrt'], environment), /requires the exact equipment key and revision/)
  assert.doesNotThrow(() => assertExpectedCompletedImportJob({ id: 'cmug1gz1u0000hgkpxt74ocrt', status: 'completed' }, 'cmug1gz1u0000hgkpxt74ocrt'))
  assert.throws(() => assertExpectedCompletedImportJob({ id: 'cmug1gz1u0000hgkpxt74ocrt', status: 'failed' }, 'cmug1gz1u0000hgkpxt74ocrt'), /to be completed/)
  assert.throws(() => assertExpectedCompletedImportJob({ id: 'other-job', status: 'completed' }, 'cmug1gz1u0000hgkpxt74ocrt'), /different job was reported/)
})

test('equipment-node opt-in requires the pinned Misaki key and exact provided asset revision', () => {
  const args = ['--run', '--equipment-key', 'CH0268_Weapon', '--equipment-revision', misakiChecksum]
  const environment = {
    ...validEnv(),
    CHIBI_ADMIN_ACCEPTANCE_STUDENT_ID: '20049',
    CHIBI_ADMIN_ACCEPTANCE_ASSET_ID: 'misaki-asset',
    CHIBI_ADMIN_ACCEPTANCE_CHECKSUM: misakiChecksum,
  }
  const config = readAcceptanceConfig(args, environment)
  assert.deepEqual(config.equipmentNode, {
    key: 'CH0268_Weapon', studentId: 20049, pathName: 'misaki_swimsuit', sourceIdentity: 'ch0268', arrangementKey: misakiArrangementKey,
    label: 'Cafe_CH0268/CH0268_Weapon', revision: misakiChecksum,
  })
  assert.equal(equipmentAdjustmentTargetOption([], 20049, misakiChecksum), null)
  assert.throws(() => readAcceptanceConfig(['--run', '--equipment-key', 'CH0268_Weapon'], environment), /equipment-revision must be supplied/)
  assert.throws(() => readAcceptanceConfig(['--run', '--equipment-revision', misakiChecksum], environment), /equipment-key must be supplied/)
  assert.throws(() => readAcceptanceConfig(['--run', '--equipment-key', 'CH0268_Rocket_Outline', '--equipment-revision', misakiChecksum], environment), /exact supported equipment target/)
  assert.throws(() => readAcceptanceConfig(args, validEnv()), /pinned to student 20049/)
  assert.throws(() => readAcceptanceConfig(['--run', '--equipment-key', 'CH0268_Weapon', '--equipment-revision', checksum], environment), /must match CHIBI_ADMIN_ACCEPTANCE_CHECKSUM/)
  assert.throws(() => readAcceptanceConfig([...args, '--equipment-key=CH0268_Weapon'], environment), /exactly once/)
})

test('equipment selector binds the provided key to the exact row allowlist, label, and revision', () => {
  const environment = {
    ...validEnv(),
    CHIBI_ADMIN_ACCEPTANCE_STUDENT_ID: '20049',
    CHIBI_ADMIN_ACCEPTANCE_ASSET_ID: 'misaki-asset',
    CHIBI_ADMIN_ACCEPTANCE_CHECKSUM: misakiChecksum,
  }
  const config = readAcceptanceConfig(['--run', '--equipment-key', 'CH0268_Weapon', '--equipment-revision', misakiChecksum], environment)
  assert.ok(config.equipmentNode)
  const row = assertTargetRow(misakiTargetRow(), config)
  assert.deepEqual(selectExactEquipmentNode(row, config.equipmentNode), { key: misakiArrangementKey, label: 'Cafe_CH0268/CH0268_Weapon' })
  const allowedNodes = (row.arrangement as Record<string, any>).allowedNodes
  assert.throws(() => selectExactEquipmentNode({ ...row, pathName: 'ch0001' }, config.equipmentNode!), /identity path changed/)
  assert.throws(() => selectExactEquipmentNode({ ...row, chibiBinding: { ...row.chibiBinding, sourceIdentity: 'ch0001' } }, config.equipmentNode!), /binding source identity changed/)
  assert.throws(() => selectExactEquipmentNode({ ...row, chibiBinding: { ...row.chibiBinding, asset: { ...(row.chibiBinding as Record<string, any>).asset, sourceIdentity: 'ch0001' } } }, config.equipmentNode!), /asset source identity changed/)
  assert.throws(() => selectExactEquipmentNode({ ...row, arrangement: { ...row.arrangement, checksum } }, config.equipmentNode!), /revision differs/)
  assert.throws(() => selectExactEquipmentNode({ ...row, arrangement: { ...row.arrangement, allowedNodes: allowedNodes.map((value: Record<string, unknown>) => value.key === misakiArrangementKey ? { ...value, label: 'Other name' } : value) } }, config.equipmentNode!), /unexpected source label/)
  assert.throws(() => selectExactEquipmentNode({ ...row, arrangement: { ...row.arrangement, allowedNodes: [...allowedNodes, allowedNodes[1]] } }, config.equipmentNode!), /must appear once/)
})

test('equipment opt-in retains the exact original override for final restoration', () => {
  const originalOverride = {
    schemaVersion: 1,
    nodes: { $model: { position: [0.1, 0, 0] }, [misakiArrangementKey]: { position: [0.21, 1.4, 0.3] } },
  }
  const row = misakiTargetRow()
  ;(row.chibiBinding as Record<string, any>).arrangementOverride = originalOverride
  const environment = {
    ...validEnv(),
    CHIBI_ADMIN_ACCEPTANCE_STUDENT_ID: '20049',
    CHIBI_ADMIN_ACCEPTANCE_ASSET_ID: 'misaki-asset',
    CHIBI_ADMIN_ACCEPTANCE_CHECKSUM: misakiChecksum,
  }
  const config = readAcceptanceConfig(['--run', '--equipment-key', 'CH0268_Weapon', '--equipment-revision', misakiChecksum], environment)
  const snapshot = originalSettings(assertTargetRow(row, config))
  const restorePayload = restoreOriginalArrangementPayload(snapshot)
  assert.deepEqual(restorePayload.override, originalOverride)
  assert.equal(restorePayload.assetId, 'misaki-asset')
  assert.equal(restorePayload.checksum, misakiChecksum)
})

test('admin adjustment acceptance rejects normal, mismatched, and remote database targets', () => {
  const normalDb = { ...validEnv(), DATABASE_URL: 'postgresql://test:test@localhost:5432/stratonas', CHIBI_TEST_DATABASE_URL: 'postgresql://test:test@localhost:5432/stratonas' }
  assert.throws(() => readAcceptanceConfig(['--run'], normalDb), /disposable chibi-acceptance/)
  assert.throws(() => readAcceptanceConfig(['--run'], { ...validEnv(), CHIBI_TEST_DATABASE_URL: 'postgresql://test:test@localhost:5432/chibi-acceptance-other' }), /match DATABASE_URL/)
  const remoteDb = 'postgresql://test:test@db.example.invalid:5432/chibi-acceptance-admin-adjustment'
  assert.throws(() => readAcceptanceConfig(['--run'], { ...validEnv(), DATABASE_URL: remoteDb, CHIBI_TEST_DATABASE_URL: remoteDb }), /database must be local/)
})

test('target row is accepted only for the exact published binding and asset revision', () => {
  const expected = { studentId: 10002, assetId: 'asset-10002', checksum }
  assert.equal(assertTargetRow(targetRow(), expected).id, expected.studentId)
  assert.throws(() => assertTargetRow({ ...targetRow(), id: 10003 }, expected), /different student ID/)
  assert.throws(() => assertTargetRow({ ...targetRow(), chibiBinding: { ...targetRow().chibiBinding, asset: { ...targetRow().chibiBinding.asset, id: 'another-asset' } } }, expected), /asset ID differs/)
  assert.throws(() => assertTargetRow({ ...targetRow(), chibiBinding: { ...targetRow().chibiBinding, asset: { ...targetRow().chibiBinding.asset, checksum: 'b'.repeat(64) } } }, expected), /checksum differs/)
  assert.throws(() => assertTargetRow({ ...targetRow(), chibiBinding: { ...targetRow().chibiBinding, identityPath: 'ch0002' } }, expected), /identity does not match/)
  assert.throws(() => assertTargetRow({ ...targetRow(), chibiBinding: { ...targetRow().chibiBinding, asset: { ...targetRow().chibiBinding.asset, published: false } } }, expected), /not published/)
})

test('saved override assertions bind the exact whole-model or equipment offset to the imported default', () => {
  const row = misakiTargetRow()
  const defaultArrangement = row.arrangement.arrangementDefault
  const modelSave = expectedArrangementOffsetSave(defaultArrangement, '$model', 0.01)
  assert.deepEqual(modelSave.effectiveArrangement.nodes.$model.position, [0.01, 0, 0])
  assert.deepEqual(modelSave.arrangementOverride, { schemaVersion: 1, nodes: { $model: { position: [0.01, 0, 0] } } })
  const modelSavedRow = {
    ...row,
    chibiBinding: { ...row.chibiBinding, arrangementOverride: modelSave.arrangementOverride },
  }
  assertSavedArrangementOverride(modelSavedRow, modelSave.arrangementOverride, 'whole-model fixture')
  assert.throws(() => assertSavedArrangementOverride(modelSavedRow, { schemaVersion: 1, nodes: {} }, 'whole-model fixture'), /persisted arrangementOverride/)

  const equipmentSave = expectedArrangementOffsetSave(defaultArrangement, misakiArrangementKey, -0.01)
  assert.deepEqual(equipmentSave.effectiveArrangement.nodes[misakiArrangementKey].position, [0.19, 1.4, 0.3])
  assert.deepEqual(equipmentSave.arrangementOverride, { schemaVersion: 1, nodes: { [misakiArrangementKey]: { position: [0.19, 1.4, 0.3] } } })
  const equipmentSavedRow = {
    ...row,
    chibiBinding: { ...row.chibiBinding, arrangementOverride: equipmentSave.arrangementOverride },
  }
  assertSavedArrangementOverride(equipmentSavedRow, equipmentSave.arrangementOverride, 'equipment fixture')
  assert.throws(() => expectedArrangementOffsetSave(defaultArrangement, 'missing-node', 0.01), /Imported default node missing-node is missing/)
})

test('non-admin /3D observations require exact public membership and no adjustment controls', () => {
  assert.doesNotThrow(() => assertNonAdminCatalogObservation({ targetListed: true, arrangementControls: 0 }, true))
  assert.doesNotThrow(() => assertNonAdminCatalogObservation({ targetListed: false, arrangementControls: 0 }, false))
  assert.throws(() => assertNonAdminCatalogObservation({ targetListed: false, arrangementControls: 0 }, true), /list membership/)
  assert.throws(() => assertNonAdminCatalogObservation({ targetListed: true, arrangementControls: 1 }, true), /exposed arrangement controls/)
  assert.throws(() => assertNonAdminCatalogObservation({ targetListed: true }, true), /observation is invalid/)
})

test('non-admin /3D DOM observation follows a bounded network-settled navigation', () => {
  const source = assertNonAdminCatalogPage.toString()
  const settledWait = source.indexOf('waitForNetworkIdle')
  const domObservation = source.indexOf('page.$eval')
  assert.ok(settledWait >= 0 && domObservation > settledWait, 'The harness must wait for client requests to settle before checking /3D controls.')
})

test('offset probe changes by one bounded UI step and refuses a fully constrained value', () => {
  assert.equal(chooseChangedOffset({ value: 0, min: -0.5, max: 0.5, step: 0.01 }), 0.01)
  assert.equal(chooseChangedOffset({ value: 0.5, min: -0.5, max: 0.5, step: 0.01 }), 0.49)
  assert.throws(() => chooseChangedOffset({ value: 0, min: 0, max: 0, step: 0.01 }), /No bounded arrangement offset/)
})

test('login waits for the hydrated form submit and controlled-input handlers', () => {
  assert.doesNotMatch(loginFormIsHydrated.toString(), /\b__name\s*\(/, 'The page predicate must not depend on a Node-side transpiler helper.')
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const elements: Record<string, Record<string, unknown>> = {
    form: {},
    email: {},
    password: {},
  }
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      querySelector(selector: string) {
        if (selector === 'form') return elements.form
        if (selector === 'input[type="email"]') return elements.email
        if (selector === 'input[type="password"]') return elements.password
        return null
      },
    },
  })

  try {
    assert.equal(loginFormIsHydrated(), false)
    elements.form['__reactProps$test'] = { onSubmit() {} }
    elements.email['__reactProps$test'] = { onChange() {} }
    assert.equal(loginFormIsHydrated(), false)
    elements.password['__reactProps$test'] = { onChange() {} }
    assert.equal(loginFormIsHydrated(), true)
  } finally {
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument)
    else Reflect.deleteProperty(globalThis, 'document')
  }
})
