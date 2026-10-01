import assert from 'node:assert/strict'
import puppeteer, { type Browser, type BrowserContext, type Page } from 'puppeteer'
import { assertDisposableDatabaseUrl, assertMaintenanceDisabled } from './chibi-acceptance-guards'
import { diffChibiArrangement, type ChibiArrangementDocument } from '../src/components/chibi/chibi-arrangement'

const EMPTY_ARRANGEMENT = { schemaVersion: 1, nodes: {} }
const ADMIN_ROSTER_PATH = '/api/admin/chibi/students'
const PUBLIC_ROSTER_PATH = '/api/chibi/students'
const V12_COMPLETED_IMPORT_JOB_ID = 'cmug1gz1u0000hgkpxt74ocrt'

type JsonRecord = Record<string, unknown>
type AcceptanceConfig = {
  origin: string
  studentId: number
  assetId: string
  checksum: string
  equipmentNode: EquipmentAdjustmentTarget | null
  completedImportJobId: string | null
  adminEmail: string
  adminPassword: string
  nonAdminEmail: string
  nonAdminPassword: string
}
type ApiResult = { status: number; body: unknown }
type TargetRow = JsonRecord & { id: number; arrangement: JsonRecord; chibiBinding: JsonRecord; catalogVisible: boolean }
type OriginalSettings = {
  assetId: string
  checksum: string
  arrangementDefault: unknown
  effectiveArrangement: unknown
  override: unknown
  catalogVisible: boolean
}

type EquipmentAdjustmentTarget = {
  key: 'CH0268_Weapon'
  studentId: 20049
  pathName: 'misaki_swimsuit'
  sourceIdentity: 'ch0268'
  arrangementKey: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29:cab-28951afa2d0662740094a0cdb63635f7:-7191168882773665943'
  label: 'Cafe_CH0268/CH0268_Weapon'
  revision: string
}

const EQUIPMENT_ADJUSTMENT_TARGETS = {
  CH0268_Weapon: {
    studentId: 20049,
    pathName: 'misaki_swimsuit',
    sourceIdentity: 'ch0268',
    arrangementKey: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29:cab-28951afa2d0662740094a0cdb63635f7:-7191168882773665943',
    label: 'Cafe_CH0268/CH0268_Weapon',
  },
} as const

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function required(env: NodeJS.ProcessEnv, key: string) {
  const value = env[key]?.trim()
  assert.ok(value, `${key} is required.`)
  return value!
}

function requiredSecret(env: NodeJS.ProcessEnv, key: string) {
  const value = env[key]
  assert.ok(value, `${key} is required.`)
  return value!
}

function optionValues(argv: readonly string[], name: string) {
  const values: string[] = []
  const prefix = `--${name}=`
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument.startsWith(prefix)) values.push(argument.slice(prefix.length).trim())
    else if (argument === `--${name}`) {
      const value = argv[index + 1]?.trim()
      assert.ok(value && !value.startsWith('--'), `--${name} requires a value.`)
      values.push(value)
      index += 1
    }
  }
  return values
}

export function equipmentAdjustmentTargetOption(argv: readonly string[], studentId: number, checksum: string): EquipmentAdjustmentTarget | null {
  const keys = optionValues(argv, 'equipment-key')
  const revisions = optionValues(argv, 'equipment-revision')
  if (keys.length === 0 && revisions.length === 0) return null
  assert.equal(keys.length, 1, '--equipment-key must be supplied exactly once with --equipment-revision.')
  assert.equal(revisions.length, 1, '--equipment-revision must be supplied exactly once with --equipment-key.')
  assert.ok(Object.hasOwn(EQUIPMENT_ADJUSTMENT_TARGETS, keys[0]), '--equipment-key must name an exact supported equipment target.')
  const targetKey = keys[0] as keyof typeof EQUIPMENT_ADJUSTMENT_TARGETS
  const target = EQUIPMENT_ADJUSTMENT_TARGETS[targetKey]
  assert.equal(studentId, target.studentId, `--equipment-key ${targetKey} is pinned to student ${target.studentId}.`)
  assert.match(revisions[0], /^[a-f0-9]{64}$/i, '--equipment-revision must be a SHA-256 hex digest.')
  assert.equal(revisions[0].toLowerCase(), checksum.toLowerCase(), '--equipment-revision must match CHIBI_ADMIN_ACCEPTANCE_CHECKSUM exactly.')
  return { key: targetKey, ...target, revision: revisions[0].toLowerCase() }
}

function completedImportJobOption(argv: readonly string[], studentId: number, equipmentNode: EquipmentAdjustmentTarget | null) {
  const jobIds = optionValues(argv, 'completed-import-job-id')
  if (jobIds.length === 0) return null
  assert.equal(jobIds.length, 1, '--completed-import-job-id must be supplied at most once.')
  assert.equal(jobIds[0], V12_COMPLETED_IMPORT_JOB_ID, '--completed-import-job-id must name the pinned v12 import job.')
  assert.equal(studentId, 20049, 'The pinned v12 import-job guard is for Misaki student 20049.')
  assert.ok(equipmentNode, 'The pinned v12 import-job guard requires the exact equipment key and revision.')
  return jobIds[0]
}

export function readAcceptanceConfig(argv: readonly string[], env: NodeJS.ProcessEnv): AcceptanceConfig {
  assert.ok(argv.includes('--run'), 'Pass --run to authorize this mutating acceptance check.')
  assert.equal(env.CHIBI_TEST_ISOLATED, 'true', 'Require CHIBI_TEST_ISOLATED=true.')
  assert.equal(env.CHIBI_ACCEPTANCE_RUN, 'true', 'Require CHIBI_ACCEPTANCE_RUN=true.')
  assertMaintenanceDisabled(env)

  const originValue = required(env, 'CHIBI_ADMIN_ACCEPTANCE_ORIGIN')
  const parsedOrigin = new URL(originValue)
  assert.equal(parsedOrigin.protocol, 'http:', 'CHIBI_ADMIN_ACCEPTANCE_ORIGIN must use local HTTP.')
  assert.ok(['localhost', '127.0.0.1'].includes(parsedOrigin.hostname), 'Admin adjustment acceptance may only target localhost.')
  assert.equal(parsedOrigin.username, '', 'CHIBI_ADMIN_ACCEPTANCE_ORIGIN may not contain credentials.')
  assert.equal(parsedOrigin.password, '', 'CHIBI_ADMIN_ACCEPTANCE_ORIGIN may not contain credentials.')
  assert.equal(parsedOrigin.pathname, '/', 'CHIBI_ADMIN_ACCEPTANCE_ORIGIN must be an origin, without a path.')
  assert.equal(parsedOrigin.search, '', 'CHIBI_ADMIN_ACCEPTANCE_ORIGIN must not include a query.')
  assert.equal(parsedOrigin.hash, '', 'CHIBI_ADMIN_ACCEPTANCE_ORIGIN must not include a fragment.')

  const databaseUrl = required(env, 'DATABASE_URL')
  assert.equal(required(env, 'CHIBI_TEST_DATABASE_URL'), databaseUrl, 'CHIBI_TEST_DATABASE_URL must match DATABASE_URL exactly.')
  const database = assertDisposableDatabaseUrl(databaseUrl)
  assert.ok(['localhost', '127.0.0.1'].includes(database.parsed.hostname), 'The disposable acceptance database must be local.')

  const studentIdValue = required(env, 'CHIBI_ADMIN_ACCEPTANCE_STUDENT_ID')
  assert.match(studentIdValue, /^\d{5}$/, 'CHIBI_ADMIN_ACCEPTANCE_STUDENT_ID must be a five-digit ID.')
  const studentId = Number(studentIdValue)
  assert.ok(studentId >= 10000 && studentId <= 99999, 'CHIBI_ADMIN_ACCEPTANCE_STUDENT_ID must be eligible.')

  const assetId = required(env, 'CHIBI_ADMIN_ACCEPTANCE_ASSET_ID')
  const checksum = required(env, 'CHIBI_ADMIN_ACCEPTANCE_CHECKSUM')
  assert.match(checksum, /^[a-f0-9]{64}$/i, 'CHIBI_ADMIN_ACCEPTANCE_CHECKSUM must be a SHA-256 hex digest.')
  const equipmentNode = equipmentAdjustmentTargetOption(argv, studentId, checksum)
  const completedImportJobId = completedImportJobOption(argv, studentId, equipmentNode)

  const adminEmail = required(env, 'CHIBI_ADMIN_ACCEPTANCE_ADMIN_EMAIL')
  const adminPassword = requiredSecret(env, 'CHIBI_ADMIN_ACCEPTANCE_ADMIN_PASSWORD')
  const nonAdminEmail = required(env, 'CHIBI_ADMIN_ACCEPTANCE_NONADMIN_EMAIL')
  const nonAdminPassword = requiredSecret(env, 'CHIBI_ADMIN_ACCEPTANCE_NONADMIN_PASSWORD')
  assert.notEqual(adminEmail.toLowerCase(), nonAdminEmail.toLowerCase(), 'Admin and non-admin test accounts must be different.')

  return { origin: parsedOrigin.origin, studentId, assetId, checksum: checksum.toLowerCase(), equipmentNode, completedImportJobId, adminEmail, adminPassword, nonAdminEmail, nonAdminPassword }
}

function normalizeOverride(value: unknown) {
  if (value === null || value === undefined || (isRecord(value) && Object.keys(value).length === 0)) {
    return EMPTY_ARRANGEMENT
  }
  assert.ok(isRecord(value) && value.schemaVersion === 1 && isRecord(value.nodes), 'The stored arrangement override is not a supported version-1 document.')
  return value
}

export function assertTargetRow(value: unknown, expected: Pick<AcceptanceConfig, 'studentId' | 'assetId' | 'checksum'>): TargetRow {
  assert.ok(isRecord(value), `Student ${expected.studentId} is missing from the admin roster.`)
  assert.equal(value.id, expected.studentId, 'Admin roster returned a different student ID.')
  assert.ok(isRecord(value.chibiBinding), `Student ${expected.studentId} has no Chibi binding.`)
  const binding = value.chibiBinding
  const assetValue = binding.asset
  assert.ok(isRecord(assetValue), `Student ${expected.studentId} has no active asset.`)
  const asset = assetValue
  assert.equal(binding.status, 'available', `Student ${expected.studentId} is not currently available.`)
  const identityPath = typeof binding.identityPath === 'string' ? binding.identityPath.trim().toLowerCase() : ''
  const pathName = typeof value.pathName === 'string' ? value.pathName.trim().toLowerCase() : ''
  assert.ok(identityPath && identityPath === pathName, `Student ${expected.studentId} binding identity does not match its roster path.`)
  assert.equal(asset.published, true, `Student ${expected.studentId} asset is not published.`)
  assert.ok(isRecord(asset.validation) && asset.validation.valid === true, `Student ${expected.studentId} asset has not passed validation.`)
  assert.equal(asset.id, expected.assetId, `Student ${expected.studentId} asset ID differs from the explicitly selected identity.`)
  assert.equal(asset.checksum, expected.checksum, `Student ${expected.studentId} checksum differs from the explicitly selected identity.`)
  assert.ok(isRecord(value.arrangement), `Student ${expected.studentId} has no arrangement record.`)
  assert.equal(value.arrangement.assetId, expected.assetId, 'Arrangement asset ID does not match the selected asset.')
  assert.equal(value.arrangement.checksum, expected.checksum, 'Arrangement checksum does not match the selected asset.')
  assert.equal(typeof value.catalogVisible, 'boolean', 'Admin roster did not return catalogVisible.')
  assert.ok(isRecord(value.arrangement.arrangementDefault) && isRecord(value.arrangement.arrangementDefault.nodes), 'Imported default arrangement is missing.')
  assert.ok(isRecord(value.arrangement.effectiveArrangement) && isRecord(value.arrangement.effectiveArrangement.nodes), 'Effective arrangement is missing.')
  return value as TargetRow
}

export function selectExactEquipmentNode(row: TargetRow, target: EquipmentAdjustmentTarget) {
  const pinned = EQUIPMENT_ADJUSTMENT_TARGETS[target.key]
  assert.ok(pinned, 'Equipment adjustment target is not allowlisted by this harness.')
  assert.equal(row.id, pinned.studentId, 'Equipment adjustment target belongs to a different student.')
  assert.equal(String(row.pathName).toLowerCase(), pinned.pathName, 'Equipment adjustment target identity path changed.')
  assert.equal(String(row.chibiBinding.identityPath).toLowerCase(), pinned.pathName, 'Equipment adjustment binding identity changed.')
  assert.equal(String(row.chibiBinding.sourceIdentity).toLowerCase(), pinned.sourceIdentity, 'Equipment adjustment binding source identity changed.')
  assert.ok(isRecord(row.chibiBinding.asset), 'Equipment adjustment binding has no active asset.')
  assert.equal(String(row.chibiBinding.asset.sourceIdentity).toLowerCase(), pinned.sourceIdentity, 'Equipment adjustment asset source identity changed.')
  assert.equal(row.arrangement.checksum, target.revision, 'Equipment adjustment target revision differs from the selected asset revision.')
  assert.deepEqual(
    { studentId: target.studentId, pathName: target.pathName, arrangementKey: target.arrangementKey, label: target.label },
    { studentId: pinned.studentId, pathName: pinned.pathName, arrangementKey: pinned.arrangementKey, label: pinned.label },
    'Equipment adjustment target differs from the pinned source identity.',
  )
  const allowedNodes = row.arrangement.allowedNodes
  assert.ok(Array.isArray(allowedNodes), 'Admin arrangement did not return its source-evidenced node allowlist.')
  const matches = allowedNodes.filter((node: unknown) => isRecord(node) && node.key === pinned.arrangementKey)
  assert.equal(matches.length, 1, `Exact equipment key ${target.key} must appear once in the server allowlist.`)
  assert.equal((matches[0] as JsonRecord).kind, 'equipment', `Exact equipment key ${target.key} is not an equipment node.`)
  assert.equal((matches[0] as JsonRecord).label, pinned.label, `Exact equipment key ${target.key} has an unexpected source label.`)
  assert.equal(allowedNodes.filter((node: unknown) => isRecord(node) && node.label === pinned.label).length, 1, `Exact equipment label ${target.key} is ambiguous in the server allowlist.`)
  const defaultNodes = (row.arrangement.arrangementDefault as JsonRecord).nodes as JsonRecord
  const effectiveNodes = (row.arrangement.effectiveArrangement as JsonRecord).nodes as JsonRecord
  assert.ok(Object.hasOwn(defaultNodes, pinned.arrangementKey), `Exact equipment key ${target.key} is absent from the imported default.`)
  assert.ok(Object.hasOwn(effectiveNodes, pinned.arrangementKey), `Exact equipment key ${target.key} is absent from the effective arrangement.`)
  assert.ok(isRecord(defaultNodes[pinned.arrangementKey]), `Exact equipment key ${target.key} has no imported default transform.`)
  return { key: pinned.arrangementKey, label: pinned.label }
}

export function chooseChangedOffset(input: { value: number; min: number; max: number; step: number }) {
  assert.ok(Number.isFinite(input.value) && Number.isFinite(input.min) && Number.isFinite(input.max), 'Arrangement input bounds must be finite.')
  assert.ok(Number.isFinite(input.step) && input.step > 0, 'Arrangement input step must be positive.')
  const precision = Math.max(0, (String(input.step).split('.')[1] || '').length)
  const candidates = [input.value + input.step, input.value - input.step]
  const changed = candidates.find(value => value >= input.min && value <= input.max && value !== input.value)
  assert.ok(changed !== undefined, 'No bounded arrangement offset can be selected for this row.')
  return Number(changed!.toFixed(Math.min(8, precision + 2)))
}

function targetPath(config: AcceptanceConfig, action: 'arrangement' | 'visibility') {
  return `/api/admin/chibi/students/${config.studentId}/${action}`
}

async function requestJson(page: Page, path: string, method = 'GET', body?: unknown): Promise<ApiResult> {
  return page.evaluate(async input => {
    const response = await fetch(input.path, {
      method: input.method,
      cache: 'no-store',
      ...(input.body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(input.body) }),
    })
    const text = await response.text()
    let parsed: unknown = null
    try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
    return { status: response.status, body: parsed }
  }, { path, method, body }) as Promise<ApiResult>
}

async function rosterStudent(page: Page, config: AcceptanceConfig) {
  const response = await requestJson(page, ADMIN_ROSTER_PATH)
  assert.equal(response.status, 200, `Admin roster returned HTTP ${response.status}.`)
  assert.ok(isRecord(response.body) && Array.isArray(response.body.students), 'Admin roster response has no students array.')
  const row = response.body.students.find((student: unknown) => isRecord(student) && student.id === config.studentId)
  return assertTargetRow(row, config)
}

export function originalSettings(row: TargetRow): OriginalSettings {
  return {
    assetId: row.arrangement.assetId as string,
    checksum: row.arrangement.checksum as string,
    arrangementDefault: row.arrangement.arrangementDefault,
    effectiveArrangement: row.arrangement.effectiveArrangement,
    override: normalizeOverride(row.chibiBinding.arrangementOverride),
    catalogVisible: row.catalogVisible,
  }
}

export function expectedArrangementOffsetSave(defaultValue: unknown, nodeKey: string, offset: number) {
  assert.ok(isRecord(defaultValue) && defaultValue.schemaVersion === 1 && isRecord(defaultValue.nodes), 'The imported default arrangement is invalid.')
  assert.ok(Number.isFinite(offset), 'The expected arrangement offset must be finite.')
  const base = defaultValue as unknown as ChibiArrangementDocument
  const originalNode = base.nodes[nodeKey]
  assert.ok(isRecord(originalNode), `Imported default node ${nodeKey} is missing.`)
  const originalPosition = originalNode.position ?? [0, 0, 0]
  assert.ok(Array.isArray(originalPosition) && originalPosition.length === 3 && originalPosition.every(Number.isFinite), `Imported default node ${nodeKey} has an invalid position.`)
  const position: [number, number, number] = [originalPosition[0] + offset, originalPosition[1], originalPosition[2]]
  const effectiveArrangement: ChibiArrangementDocument = {
    schemaVersion: 1,
    nodes: { ...base.nodes, [nodeKey]: { ...originalNode, position } },
  }
  return { effectiveArrangement, arrangementOverride: diffChibiArrangement(base, effectiveArrangement) }
}

export function assertSavedArrangementOverride(value: unknown, expectedOverride: unknown, label: string) {
  assert.ok(isRecord(value) && isRecord(value.chibiBinding), `${label}: saved binding is missing.`)
  assert.deepEqual(normalizeOverride(value.chibiBinding.arrangementOverride), expectedOverride, `${label}: the persisted arrangementOverride differs from the expected exact delta.`)
}

export function assertNonAdminCatalogObservation(value: unknown, expectedVisible: boolean) {
  assert.ok(isRecord(value) && typeof value.targetListed === 'boolean' && Number.isInteger(value.arrangementControls), 'The non-admin /3D observation is invalid.')
  assert.equal(value.targetListed, expectedVisible, `The non-admin /3D list membership did not match ${expectedVisible}.`)
  assert.equal(value.arrangementControls, 0, 'A non-admin /3D page exposed arrangement controls.')
}

function arrangementPayload(settings: OriginalSettings, override: unknown) {
  return { schemaVersion: 1, assetId: settings.assetId, checksum: settings.checksum, override }
}

export function restoreOriginalArrangementPayload(settings: OriginalSettings) {
  return arrangementPayload(settings, settings.override)
}

function visibilityPayload(settings: OriginalSettings, catalogVisible: boolean) {
  return { schemaVersion: 1, assetId: settings.assetId, checksum: settings.checksum, catalogVisible }
}

async function assertPublicState(page: Page, config: AcceptanceConfig, settings: OriginalSettings, visible: boolean) {
  const response = await requestJson(page, PUBLIC_ROSTER_PATH)
  assert.equal(response.status, 200, `Public roster returned HTTP ${response.status}.`)
  assert.ok(isRecord(response.body) && Array.isArray(response.body.students), 'Public roster response has no students array.')
  const row = response.body.students.find((student: unknown) => isRecord(student) && student.id === config.studentId)
  assert.equal(Boolean(row), visible, `Student ${config.studentId} public-catalog visibility did not match ${visible}.`)
  if (visible) {
    assert.ok(isRecord(row) && isRecord(row.model), `Visible student ${config.studentId} has no public model.`)
    assert.equal(row.model.assetId, settings.assetId, 'Public model asset changed during the adjustment test.')
    assert.equal(row.model.revision, settings.checksum, 'Public model revision changed during the adjustment test.')
  }
}

export function assertExpectedCompletedImportJob(job: unknown, expectedJobId: string) {
  assert.ok(isRecord(job), `Expected completed Chibi import job ${expectedJobId}, but no job was reported.`)
  assert.equal(job.id, expectedJobId, `Expected Chibi import job ${expectedJobId}, but a different job was reported.`)
  assert.equal(job.status, 'completed', `Expected Chibi import job ${expectedJobId} to be completed.`)
}

async function assertNoActiveImport(page: Page, expectedCompletedJobId: string | null) {
  const response = await requestJson(page, '/api/admin/chibi/import/status')
  assert.equal(response.status, 200, `Import status returned HTTP ${response.status}.`)
  assert.ok(isRecord(response.body), 'Import status response is invalid.')
  const job = response.body.job
  if (expectedCompletedJobId) {
    assertExpectedCompletedImportJob(job, expectedCompletedJobId)
    return
  }
  assert.ok(job === null || (isRecord(job) && ['completed', 'failed'].includes(String(job.status))), 'A Chibi import is active or has an unknown state; refusing to change this row.')
}

async function login(page: Page, origin: string, email: string, password: string) {
  await page.goto(`${origin}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('input[type="email"]')
  await page.waitForFunction(loginFormIsHydrated, { timeout: 30_000 })
  await page.type('input[type="email"]', email)
  await page.type('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForFunction(() => location.pathname !== '/login', { timeout: 30_000 })
}

export function loginFormIsHydrated() {
  const form = document.querySelector('form')
  const formKey = form && Object.keys(form).find(name => name.startsWith('__reactProps$'))
  const formProps = formKey && form ? (form as unknown as Record<string, unknown>)[formKey] as Record<string, unknown> : null
  const email = document.querySelector('input[type="email"]')
  const emailKey = email && Object.keys(email).find(name => name.startsWith('__reactProps$'))
  const emailProps = emailKey && email ? (email as unknown as Record<string, unknown>)[emailKey] as Record<string, unknown> : null
  const password = document.querySelector('input[type="password"]')
  const passwordKey = password && Object.keys(password).find(name => name.startsWith('__reactProps$'))
  const passwordProps = passwordKey && password ? (password as unknown as Record<string, unknown>)[passwordKey] as Record<string, unknown> : null
  return typeof formProps?.onSubmit === 'function'
    && typeof emailProps?.onChange === 'function'
    && typeof passwordProps?.onChange === 'function'
}

async function openSelectedRow(page: Page, config: AcceptanceConfig) {
  await page.goto(`${config.origin}/3D?student=${config.studentId}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[aria-label="Chibi arrangement controls"]', { timeout: 30_000 })
  const selected = await page.$eval('[aria-label="Student results"] button[aria-current="true"]', element => element.textContent || '')
  assert.ok(selected.includes(String(config.studentId)), 'The UI selected a different student than requested.')
}

async function readOffset(page: Page) {
  return page.$eval('input[aria-label="Position offset X"]', element => {
    const input = element as HTMLInputElement
    return { value: Number(input.value), min: Number(input.min), max: Number(input.max), step: Number(input.step) }
  }) as Promise<{ value: number; min: number; max: number; step: number }>
}

async function equipmentPositionInput(page: Page, label: string) {
  const fieldsets = await page.$$('[aria-label="Chibi arrangement controls"] fieldset')
  const matches = []
  for (const fieldset of fieldsets) {
    const legend = await fieldset.$eval('legend', element => element.textContent?.trim() || '').catch(() => '')
    if (legend === label) matches.push(fieldset)
  }
  assert.equal(matches.length, 1, `The exact equipment control ${JSON.stringify(label)} must appear once in the Admin panel.`)
  const input = await matches[0].$('input[aria-label="Position offset X"]')
  assert.ok(input, `The exact equipment control ${JSON.stringify(label)} has no Position offset X input.`)
  return input!
}

async function readEquipmentOffset(page: Page, label: string) {
  const input = await equipmentPositionInput(page, label)
  return input.evaluate(element => {
    const control = element as HTMLInputElement
    return { value: Number(control.value), min: Number(control.min), max: Number(control.max), step: Number(control.step) }
  }) as Promise<{ value: number; min: number; max: number; step: number }>
}

async function setEquipmentOffset(page: Page, label: string, value: number) {
  const input = await equipmentPositionInput(page, label)
  await input.asLocator().fill(String(value))
}

async function setOffset(page: Page, value: number) {
  await page.locator('input[aria-label="Position offset X"]').fill(String(value))
}

async function clickExactText(page: Page, selector: string, text: string) {
  const clicked = await page.$$eval(selector, (elements, expected) => {
    const element = elements.find(item => item.textContent?.trim() === expected) as HTMLElement | undefined
    if (!element) return false
    element.click()
    return true
  }, text)
  assert.equal(clicked, true, `Could not find ${JSON.stringify(text)} control.`)
}

async function waitForMutation(page: Page, config: AcceptanceConfig, action: 'arrangement' | 'visibility', click: () => Promise<void>) {
  const path = targetPath(config, action)
  const responsePromise = page.waitForResponse(response => response.request().method() === 'PUT' && new URL(response.url()).pathname === path, { timeout: 15_000 })
  await click()
  return responsePromise
}

async function checkNonAdminDenial(browser: Browser, config: AcceptanceConfig, snapshot: OriginalSettings) {
  const context = await browser.createBrowserContext()
  try {
    const page = await context.newPage()
    await login(page, config.origin, config.nonAdminEmail, config.nonAdminPassword)
    const roster = await requestJson(page, ADMIN_ROSTER_PATH)
    assert.equal(roster.status, 401, 'A signed-in non-admin unexpectedly accessed the admin roster.')
    for (const action of ['arrangement', 'visibility'] as const) {
      const body = action === 'arrangement'
        ? arrangementPayload(snapshot, snapshot.override)
        : visibilityPayload(snapshot, snapshot.catalogVisible)
      const response = await requestJson(page, targetPath(config, action), 'PUT', body)
      assert.equal(response.status, 401, `A signed-in non-admin was not denied ${action} updates.`)
    }
    return { context, page }
  } catch (error) {
    await context.close()
    throw error
  }
}

export async function assertNonAdminCatalogPage(page: Page, config: AcceptanceConfig, expectedVisible: boolean) {
  await page.goto(`${config.origin}/3D?student=${config.studentId}`, { waitUntil: 'load', timeout: 30_000 })
  await page.waitForNetworkIdle({ idleTime: 750, timeout: 30_000 })
  await page.waitForSelector('[aria-label="Student results"]', { timeout: 30_000 })
  const observation = await page.$eval('[aria-label="Student results"]', (container, studentId) => ({
    targetListed: Array.from(container.querySelectorAll('button')).some(button =>
      Array.from(button.querySelectorAll('span')).some(span => span.textContent?.trim() === String(studentId))),
    arrangementControls: document.querySelectorAll('[aria-label="Chibi arrangement controls"]').length,
  }), config.studentId)
  assertNonAdminCatalogObservation(observation, expectedVisible)
}

async function assertImportedDefaultDisplayed(page: Page, row: TargetRow) {
  const display = await page.$eval('[aria-label="Whole model imported default"]', element => element.textContent || '')
  assert.ok(display.includes('Imported default'), 'Imported default is not labelled in the adjustment UI.')
  const model = (row.arrangement.arrangementDefault as JsonRecord).nodes as JsonRecord
  const modelNode = model.$model
  assert.ok(isRecord(modelNode), 'The imported default has no whole-model node.')
  for (const key of ['position', 'rotation', 'scale'] as const) {
    const vector = modelNode[key]
    if (Array.isArray(vector)) assert.ok(display.includes(vector.join(', ')), `The read-only imported ${key} differs from the server default.`)
  }
}

async function setCatalogVisibility(page: Page, publicPage: Page, config: AcceptanceConfig, settings: OriginalSettings, visible: boolean) {
  const selector = '[aria-label="Chibi arrangement controls"] input[type="checkbox"]'
  const current = await page.$eval(selector, element => (element as HTMLInputElement).checked)
  if (current !== visible) {
    const response = await waitForMutation(page, config, 'visibility', () => page.click(selector))
    assert.equal(response.status(), 200, `Visibility update returned HTTP ${response.status()}.`)
  }
  await page.waitForFunction(expected => {
    const checkbox = document.querySelector<HTMLInputElement>('[aria-label="Chibi arrangement controls"] input[type="checkbox"]')
    return checkbox?.checked === expected
  }, { timeout: 10_000 }, visible)
  const row = await rosterStudent(page, config)
  assert.equal(row.catalogVisible, visible, `Admin roster did not persist catalogVisible=${visible}.`)
  assert.deepEqual(row.arrangement.arrangementDefault, settings.arrangementDefault, 'Visibility change modified the imported default.')
  assert.deepEqual(row.arrangement.effectiveArrangement, settings.effectiveArrangement, 'Visibility change modified the saved arrangement.')
  await assertPublicState(page, config, settings, visible)
  await assertNonAdminCatalogPage(publicPage, config, visible)
}

async function exerciseEquipmentAdjustment(
  page: Page,
  config: AcceptanceConfig,
  target: EquipmentAdjustmentTarget,
  noWriteRequests: string[],
) {
  const before = await rosterStudent(page, config)
  const selector = selectExactEquipmentNode(before, target)
  const writesBefore = noWriteRequests.length
  const probe = chooseChangedOffset(await readEquipmentOffset(page, selector.label))
  await setEquipmentOffset(page, selector.label, probe)
  await page.waitForFunction(() => [...document.querySelectorAll('[aria-label="Chibi arrangement controls"] [role="status"]')]
    .some(element => element.textContent?.includes('Unsaved changes')))
  assert.equal(noWriteRequests.length, writesBefore, 'Previewing an equipment-node adjustment unexpectedly wrote an admin setting.')

  await clickExactText(page, 'button', 'Reload default')
  await page.waitForSelector('dialog[open]')
  const dialogText = await page.$eval('dialog[open]', element => element.textContent || '')
  assert.match(dialogText, /does not save or change the stored override/i)
  await clickExactText(page, 'dialog[open] button', 'Cancel')
  await page.waitForFunction(() => !document.querySelector('dialog[open]'))
  assert.equal((await readEquipmentOffset(page, selector.label)).value, probe, 'Reload Default Cancel discarded the equipment-node draft.')
  assert.equal(noWriteRequests.length, writesBefore, 'Cancelling equipment Reload Default unexpectedly wrote an admin setting.')

  await clickExactText(page, 'button', 'Reload default')
  await page.waitForSelector('dialog[open]')
  await clickExactText(page, 'dialog[open] button', 'Reload Default')
  await page.waitForFunction(() => !document.querySelector('dialog[open]'))
  await page.waitForFunction(expected => {
    const fieldset = [...document.querySelectorAll('[aria-label="Chibi arrangement controls"] fieldset')]
      .find(value => value.querySelector('legend')?.textContent?.trim() === expected)
    return Number(fieldset?.querySelector<HTMLInputElement>('input[aria-label="Position offset X"]')?.value) === 0
  }, { timeout: 10_000 }, selector.label)
  assert.equal(noWriteRequests.length, writesBefore, 'Confirming equipment Reload Default unexpectedly wrote an admin setting.')
  const afterReloadDefault = await rosterStudent(page, config)
  assert.deepEqual(afterReloadDefault.arrangement.arrangementDefault, before.arrangement.arrangementDefault, 'Equipment Reload Default changed the imported default.')
  assert.deepEqual(afterReloadDefault.arrangement.effectiveArrangement, before.arrangement.effectiveArrangement, 'Equipment Reload Default changed the saved arrangement before Save.')

  const saveOffset = chooseChangedOffset(await readEquipmentOffset(page, selector.label))
  await setEquipmentOffset(page, selector.label, saveOffset)
  await page.waitForFunction(() => [...document.querySelectorAll('[aria-label="Chibi arrangement controls"] [role="status"]')]
    .some(element => element.textContent?.includes('Unsaved changes')))
  const saveResponse = await waitForMutation(page, config, 'arrangement', () => clickExactText(page, 'button', 'Save arrangement'))
  assert.equal(saveResponse.status(), 200, `Equipment arrangement save returned HTTP ${saveResponse.status()}.`)
  await page.waitForFunction(() => [...document.querySelectorAll('[aria-label="Chibi arrangement controls"] [role="status"]')]
    .some(element => element.textContent?.includes('Saved override active')))
  assert.equal(noWriteRequests.length, writesBefore + 1, 'Equipment Save should issue exactly one arrangement write.')

  const saved = await rosterStudent(page, config)
  const exactNode = selectExactEquipmentNode(saved, target)
  const expectedSave = expectedArrangementOffsetSave(before.arrangement.arrangementDefault, exactNode.key, saveOffset)
  assert.deepEqual(saved.arrangement.arrangementDefault, before.arrangement.arrangementDefault, 'Equipment Save modified the imported default.')
  assert.deepEqual(saved.arrangement.effectiveArrangement, expectedSave.effectiveArrangement, 'Equipment Save persisted an unexpected effective arrangement.')
  assertSavedArrangementOverride(saved, expectedSave.arrangementOverride, 'Equipment Save')
  const defaults = (saved.arrangement.arrangementDefault as JsonRecord).nodes as JsonRecord
  const effective = (saved.arrangement.effectiveArrangement as unknown as JsonRecord).nodes as JsonRecord
  for (const [key, value] of Object.entries(defaults)) {
    if (key !== exactNode.key) assert.deepEqual(effective[key], value, `Equipment Save changed unrelated arrangement node ${key}.`)
  }
  const defaultNode = defaults[exactNode.key] as JsonRecord
  const effectiveNode = effective[exactNode.key] as JsonRecord
  const expectedPosition = Array.isArray(defaultNode.position) ? [...defaultNode.position] as number[] : [0, 0, 0]
  expectedPosition[0] += saveOffset
  assert.deepEqual(effectiveNode.position, expectedPosition, 'Equipment Save did not persist the exact target node offset.')

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[aria-label="Chibi arrangement controls"]', { timeout: 30_000 })
  const afterPageReload = await rosterStudent(page, config)
  const reloadedTarget = selectExactEquipmentNode(afterPageReload, target)
  assert.equal((await readEquipmentOffset(page, reloadedTarget.label)).value, saveOffset, 'Equipment adjustment did not reload its saved offset.')
  assert.deepEqual(afterPageReload.arrangement.arrangementDefault, before.arrangement.arrangementDefault, 'Imported default changed after equipment adjustment reload.')
  assert.deepEqual(afterPageReload.arrangement.effectiveArrangement, saved.arrangement.effectiveArrangement, 'Equipment adjustment did not persist after page reload.')
  assertSavedArrangementOverride(afterPageReload, expectedSave.arrangementOverride, 'Equipment Save after page reload')
  return { key: target.key, arrangementKey: exactNode.key, revision: target.revision, preview: 'draft-only until Save', save: 'persisted after page reload', reloadDefault: 'cancel preserved draft; confirm restored imported default without writing' }
}

async function restoreOriginal(page: Page, publicPage: Page | null, config: AcceptanceConfig, snapshot: OriginalSettings) {
  const arrangement = await requestJson(page, targetPath(config, 'arrangement'), 'PUT', restoreOriginalArrangementPayload(snapshot))
  assert.equal(arrangement.status, 200, `Could not restore the original arrangement (HTTP ${arrangement.status}).`)
  const visibility = await requestJson(page, targetPath(config, 'visibility'), 'PUT', visibilityPayload(snapshot, snapshot.catalogVisible))
  assert.equal(visibility.status, 200, `Could not restore original catalog visibility (HTTP ${visibility.status}).`)

  const restored = await rosterStudent(page, config)
  assert.deepEqual(normalizeOverride(restored.chibiBinding.arrangementOverride), snapshot.override, 'Original arrangement override was not restored.')
  assert.deepEqual(restored.arrangement.arrangementDefault, snapshot.arrangementDefault, 'Imported default changed during acceptance.')
  assert.deepEqual(restored.arrangement.effectiveArrangement, snapshot.effectiveArrangement, 'Original effective arrangement was not restored.')
  assert.equal(restored.catalogVisible, snapshot.catalogVisible, 'Original catalog visibility was not restored.')
  await assertPublicState(page, config, snapshot, snapshot.catalogVisible)
  if (publicPage) await assertNonAdminCatalogPage(publicPage, config, snapshot.catalogVisible)
}

export async function runAdminAdjustmentAcceptance(config: AcceptanceConfig) {
  let browser: Browser | null = null
  let nonAdminContext: BrowserContext | null = null
  let nonAdminPage: Page | null = null
  let adminPage: Page | null = null
  let snapshot: OriginalSettings | null = null
  let failure: unknown
  let restorationFailure: unknown
  let result: JsonRecord | null = null
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
    adminPage = await browser.newPage()
    await adminPage.setViewport({ width: 1440, height: 1080, deviceScaleFactor: 1 })
    await login(adminPage, config.origin, config.adminEmail, config.adminPassword)
    await assertNoActiveImport(adminPage, config.completedImportJobId)

    const initial = await rosterStudent(adminPage, config)
    if (config.equipmentNode) selectExactEquipmentNode(initial, config.equipmentNode)
    snapshot = originalSettings(initial)
    await assertPublicState(adminPage, config, snapshot, snapshot.catalogVisible)
    const nonAdminSession = await checkNonAdminDenial(browser, config, snapshot)
    nonAdminContext = nonAdminSession.context
    nonAdminPage = nonAdminSession.page
    await assertNonAdminCatalogPage(nonAdminPage, config, snapshot.catalogVisible)
    await openSelectedRow(adminPage, config)
    await assertImportedDefaultDisplayed(adminPage, initial)

    const noWriteRequests: string[] = []
    adminPage.on('request', request => {
      const path = new URL(request.url()).pathname
      if (request.method() === 'PUT' && [targetPath(config, 'arrangement'), targetPath(config, 'visibility')].includes(path)) noWriteRequests.push(path)
    })
    const beforeCancel = await readOffset(adminPage)
    const probe = chooseChangedOffset(beforeCancel)
    const defaultDisplay = await adminPage.$eval('[aria-label="Whole model imported default"]', element => element.textContent || '')
    await setOffset(adminPage, probe)
    await adminPage.waitForFunction(() => [...document.querySelectorAll('[aria-label="Chibi arrangement controls"] [role="status"]')]
      .some(element => element.textContent?.includes('Unsaved changes')))

    await clickExactText(adminPage, 'button', 'Reload default')
    await adminPage.waitForSelector('dialog[open]')
    const dialogText = await adminPage.$eval('dialog[open]', element => element.textContent || '')
    assert.match(dialogText, /does not save or change the stored override/i)
    await clickExactText(adminPage, 'dialog[open] button', 'Cancel')
    await adminPage.waitForFunction(() => !document.querySelector('dialog[open]'))
    assert.equal((await readOffset(adminPage)).value, probe, 'Reload Default Cancel discarded the current draft.')
    assert.equal(await adminPage.$eval('[aria-label="Whole model imported default"]', element => element.textContent || ''), defaultDisplay, 'Editing changed the displayed imported default.')
    assert.deepEqual(noWriteRequests, [], 'Cancelling Reload Default unexpectedly wrote an admin setting.')

    await clickExactText(adminPage, 'button', 'Reload default')
    await adminPage.waitForSelector('dialog[open]')
    await clickExactText(adminPage, 'dialog[open] button', 'Reload Default')
    await adminPage.waitForFunction(() => !document.querySelector('dialog[open]'))
    await adminPage.waitForFunction(() => Number((document.querySelector('input[aria-label="Position offset X"]') as HTMLInputElement | null)?.value) === 0)
    assert.deepEqual(noWriteRequests, [], 'Confirming Reload Default unexpectedly wrote an admin setting.')
    const afterReloadDefault = await rosterStudent(adminPage, config)
    assert.deepEqual(afterReloadDefault.arrangement.arrangementDefault, snapshot.arrangementDefault, 'Reload Default changed the imported arrangement.')
    assert.deepEqual(afterReloadDefault.arrangement.effectiveArrangement, snapshot.effectiveArrangement, 'Reload Default changed the saved arrangement before Save.')

    const saveOffset = chooseChangedOffset(await readOffset(adminPage))
    await setOffset(adminPage, saveOffset)
    await adminPage.waitForFunction(() => [...document.querySelectorAll('[aria-label="Chibi arrangement controls"] [role="status"]')]
      .some(element => element.textContent?.includes('Unsaved changes')))
    const saveResponse = await waitForMutation(adminPage, config, 'arrangement', () => clickExactText(adminPage!, 'button', 'Save arrangement'))
    assert.equal(saveResponse.status(), 200, `Arrangement save returned HTTP ${saveResponse.status()}.`)
    await adminPage.waitForFunction(() => [...document.querySelectorAll('[aria-label="Chibi arrangement controls"] [role="status"]')]
      .some(element => element.textContent?.includes('Saved override active')))
    assert.equal(noWriteRequests.length, 1, 'Save should issue exactly one arrangement write.')

    const saved = await rosterStudent(adminPage, config)
    const expectedSave = expectedArrangementOffsetSave(snapshot.arrangementDefault, '$model', saveOffset)
    assert.deepEqual(saved.arrangement.arrangementDefault, snapshot.arrangementDefault, 'Save modified the imported default.')
    assert.deepEqual(saved.arrangement.effectiveArrangement, expectedSave.effectiveArrangement, 'Save persisted an unexpected effective arrangement.')
    assertSavedArrangementOverride(saved, expectedSave.arrangementOverride, 'Arrangement Save')
    const savedEffective = saved.arrangement.effectiveArrangement
    await adminPage.reload({ waitUntil: 'domcontentloaded' })
    await adminPage.waitForSelector('[aria-label="Chibi arrangement controls"]', { timeout: 30_000 })
    const afterPageReload = await rosterStudent(adminPage, config)
    assert.deepEqual(afterPageReload.arrangement.arrangementDefault, snapshot.arrangementDefault, 'Imported default changed after page reload.')
    assert.deepEqual(afterPageReload.arrangement.effectiveArrangement, savedEffective, 'Saved arrangement did not persist after page reload.')
    assertSavedArrangementOverride(afterPageReload, expectedSave.arrangementOverride, 'Arrangement Save after page reload')
    assert.equal((await readOffset(adminPage)).value, saveOffset, 'The adjustment UI did not reload the saved offset.')
    await assertImportedDefaultDisplayed(adminPage, afterPageReload)

    const equipmentAdjustment = config.equipmentNode
      ? await exerciseEquipmentAdjustment(adminPage, config, config.equipmentNode, noWriteRequests)
      : null
    const arrangementWrites = 1 + (equipmentAdjustment ? 1 : 0)
    const beforeVisibility = await rosterStudent(adminPage, config)
    const visibilitySettings = { ...snapshot, effectiveArrangement: beforeVisibility.arrangement.effectiveArrangement }
    assert.ok(nonAdminPage, 'The separate non-admin /3D page was not created.')
    await setCatalogVisibility(adminPage, nonAdminPage, config, visibilitySettings, true)
    await setCatalogVisibility(adminPage, nonAdminPage, config, visibilitySettings, false)
    await setCatalogVisibility(adminPage, nonAdminPage, config, visibilitySettings, true)
    assert.equal(noWriteRequests.length, arrangementWrites + (snapshot.catalogVisible ? 2 : 3), 'Expected the arrangement saves plus the visibility changes exercised in the UI.')

    result = { status: 'passed', studentId: config.studentId, assetId: config.assetId, checksum: config.checksum, originalVisibility: snapshot.catalogVisible, arrangementSave: 'exact override persisted after page reload', ...(equipmentAdjustment ? { equipmentAdjustment } : {}), reloadDefault: 'cancel and confirm remained draft-only', publicVisibility: '/3D membership hide/show verified in non-admin context', nonAdmin: 'admin routes denied with HTTP 401 and arrangement controls absent on /3D', serverRestart: 'not tested; page reload is not a server restart' }
  } catch (error) {
    failure = error
  } finally {
    if (snapshot && adminPage) {
      try { await restoreOriginal(adminPage, nonAdminPage, config, snapshot) } catch (error) { restorationFailure = error }
    }
    if (nonAdminContext) {
      try { await nonAdminContext.close() } catch (error) { restorationFailure ??= error }
    }
    if (browser) {
      try { await browser.close() } catch (error) { restorationFailure ??= error }
    }
  }

  if (failure && restorationFailure) {
    const describe = (error: unknown) => error instanceof Error ? error.message : String(error)
    throw new Error(`Admin adjustment acceptance failed (${describe(failure)}) and original settings could not be fully restored (${describe(restorationFailure)}).`)
  }
  if (restorationFailure) throw restorationFailure
  if (failure) throw failure
  assert.ok(result, 'Admin adjustment acceptance exited without a result.')
  return result
}

async function main() {
  const config = readAcceptanceConfig(process.argv.slice(2), process.env)
  const result = await runAdminAdjustmentAcceptance(config)
  console.log(JSON.stringify(result, null, 2))
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/test-chibi-admin-adjustment.ts')) {
  main().catch(error => {
    console.error(error)
    process.exitCode = 1
  })
}
