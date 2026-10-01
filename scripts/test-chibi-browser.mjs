import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'
import {
  browserSelectionMatchesStudent,
  PILOT_STUDENT_ID,
  actionScreenshotPlan,
  availableProfileActions,
  extractCharacterDiagnostics,
  parseBrowserMode,
  parseGlbAnimationDurations,
  parseGlbJson,
  planBrowserRoster,
  resolveActionCaptureTiming,
  screenshotPlan,
  summarizeActionObservation,
} from './chibi-browser-harness.mjs'

const base = (process.env.CHIBI_TEST_ORIGIN || 'http://127.0.0.1:3000').replace(/\/$/, '')
const parsedOrigin = new URL(base)
assert.ok(['localhost', '127.0.0.1'].includes(parsedOrigin.hostname), 'Browser checks run against localhost only.')
assert.equal(process.env.CHIBI_TEST_ISOLATED, 'true', 'Browser checks require CHIBI_TEST_ISOLATED=true because they write screenshots and reports.')
const databaseUrl = process.env.CHIBI_TEST_DATABASE_URL
assert.ok(databaseUrl && databaseUrl === process.env.DATABASE_URL, 'Browser checks require CHIBI_TEST_DATABASE_URL to match the app DATABASE_URL.')
const database = new URL(databaseUrl)
const databaseName = decodeURIComponent(database.pathname.replace(/^\/+/, ''))
const schema = database.searchParams.get('schema') || ''
const options = decodeURIComponent((database.searchParams.get('options') || '').replace(/\+/g, ' '))
const searchPath = options.match(/(?:^|[\s,])search_path\s*=\s*["']?([^\s,"']+)/i)?.[1] || ''
assert.ok([databaseName, schema, searchPath, options].some(value => /^chibi[-_](?:acceptance|test)[-_][a-z0-9][a-z0-9_-]*$/i.test(value)), 'Browser checks require a disposable chibi-acceptance-* or chibi-test-* database/schema.')
assert.ok(![databaseName, schema, searchPath].some(value => /^stratonas(?:[-_]|$)/i.test(value)), 'Browser checks refuse the normal stratonas database/schema.')
assert.equal(process.env.MAINTENANCE_SCHEDULER, 'disabled', 'Browser checks require MAINTENANCE_SCHEDULER=disabled.')
const dataRoot = process.env.CHIBI_DATA_DIR
assert.ok(dataRoot && path.isAbsolute(dataRoot), 'Browser checks require an absolute CHIBI_DATA_DIR.')
const sourceRoot = process.env.CHIBI_SOURCE_DIR
if (sourceRoot) assert.ok(path.isAbsolute(sourceRoot), 'CHIBI_SOURCE_DIR must be an absolute path when provided to browser checks.')
const normalRoots = [path.resolve('Development_data/chibi'), path.resolve('Production_data/chibi'), path.resolve('public/assets/chibi')]
const overlaps = (left, right) => {
  const a = path.resolve(left).toLowerCase()
  const b = path.resolve(right).toLowerCase()
  return a === b || a.startsWith(`${b}${path.sep}`) || b.startsWith(`${a}${path.sep}`)
}
assert.ok(!normalRoots.some(root => overlaps(dataRoot, root)), 'Browser checks refuse the normal or published chibi data roots.')
const outputValue = process.env.CHIBI_TEST_OUTPUT_DIR
assert.ok(outputValue && path.isAbsolute(outputValue), 'Browser checks require an absolute CHIBI_TEST_OUTPUT_DIR outside the repository data roots.')
assert.ok(!normalRoots.some(root => overlaps(outputValue, root)), 'Browser checks refuse to write reports below the normal or published chibi roots.')
assert.ok(!overlaps(outputValue, dataRoot), 'Browser checks require CHIBI_TEST_OUTPUT_DIR to be separate from CHIBI_DATA_DIR.')
if (sourceRoot) assert.ok(!overlaps(outputValue, sourceRoot), 'Browser checks require CHIBI_TEST_OUTPUT_DIR to be separate from CHIBI_SOURCE_DIR.')
const output = path.resolve(outputValue)
await fs.mkdir(output, { recursive: true })
const checkpointDirectory = path.join(output, 'browser-checkpoints', `${Date.now()}-${process.pid}-${randomUUID()}`)

function requestedMode() {
  const inline = process.argv.find(value => value.startsWith('--mode='))
  if (inline) return parseBrowserMode(inline.slice('--mode='.length).trim())
  const index = process.argv.indexOf('--mode')
  if (index >= 0) return parseBrowserMode(process.argv[index + 1]?.trim())
  if (process.argv.includes('--full')) return 'full'
  if (process.argv.includes('--pilot')) return 'pilot'
  return parseBrowserMode(process.env.CHIBI_BROWSER_MODE || process.env.CHIBI_TEST_BROWSER_MODE || process.env.CHIBI_TEST_ROSTER || process.env.CHIBI_ACCEPTANCE_ROSTER || 'pilot')
}

function timeoutMs() {
  const value = Number(process.env.CHIBI_BROWSER_TIMEOUT_MS || 60_000)
  assert.ok(Number.isInteger(value) && value >= 5_000 && value <= 10 * 60_000, 'CHIBI_BROWSER_TIMEOUT_MS must be between 5000 and 600000.')
  return value
}

function checkpointFileName(studentId) {
  const value = String(studentId)
  assert.match(value, /^\d{5}$/, `Student checkpoint id must be a five-digit number, got ${value}.`)
  return `${value}.json`
}

async function writeAtomicJson(directory, fileName, value) {
  assert.equal(path.basename(fileName), fileName, 'Checkpoint filename must not contain path separators.')
  assert.match(fileName, /^[a-z0-9][a-z0-9_-]*\.json$/i, `Checkpoint filename is unsafe: ${fileName}.`)
  await fs.mkdir(directory, { recursive: true })
  const target = path.join(directory, fileName)
  const temporary = path.join(directory, `.${fileName}.${randomUUID()}.tmp`)
  try {
    await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
    await fs.rename(temporary, target)
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {})
    throw error
  }
  return target
}

async function writeCharacterCheckpoint(result, mode) {
  // Checkpoints are write-only evidence. They are never read to skip a roster
  // row, so a later run cannot turn partial prior output into a false pass.
  return writeAtomicJson(checkpointDirectory, checkpointFileName(result.studentId), {
    version: 1,
    origin: base,
    mode,
    generatedAt: new Date().toISOString(),
    ...result,
  })
}

function pause(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchCatalog() {
  const response = await fetch(`${base}/api/chibi/students`)
  assert.equal(response.status, 200, `Public Chibi catalog returned HTTP ${response.status}.`)
  const body = await response.json()
  assert.ok(body && Array.isArray(body.students), 'Public Chibi catalog response has no students array.')
  return body.students
}

async function assertProtectedRoutes() {
  const protectedRoutes = [
    ['POST', '/api/admin/chibi/import'], ['POST', '/api/admin/chibi/preview'],
    ['PUT', '/api/admin/chibi/students/10002/mapping'],
    ['GET', '/api/admin/chibi/import/status'], ['GET', '/api/admin/chibi/import/jobs/unknown'],
    ['GET', '/api/admin/chibi/students'], ['GET', '/api/admin/chibi/candidates?studentId=10002'],
    ['GET', `/api/admin/chibi/assets/unpublished/${'0'.repeat(64)}.glb`],
  ]
  for (const [method, url] of protectedRoutes) {
    const response = await fetch(base + url, { method, ...(method === 'GET' ? {} : { headers: { 'Content-Type': 'application/json' }, body: '{}' }) })
    assert.equal(response.status, 401, `${method} ${url} must require admin.`)
  }
  return protectedRoutes.length
}

async function fetchCharacterDiagnostics(student) {
  assert.ok(student.model, `Student ${student.id} has no published model.`)
  const artifact = new URL(student.model.url, base)
  const response = await fetch(artifact)
  assert.equal(response.status, 200, `Student ${student.id} model returned HTTP ${response.status}.`)
  assert.equal(response.headers.get('Content-Type'), 'model/gltf-binary', `Student ${student.id} model has an unexpected content type.`)
  const bytes = await response.arrayBuffer()
  const glbJson = parseGlbJson(bytes)
  const diagnostics = extractCharacterDiagnostics(glbJson)
  return { ...diagnostics, animationDurations: parseGlbAnimationDurations(bytes), byteLength: bytes.byteLength, url: artifact.pathname }
}

function installBrowserErrorCapture(page) {
  const errors = { page: [], console: [], requests: [] }
  page.on('pageerror', error => errors.page.push(String(error?.message || error)))
  page.on('console', message => {
    if (message.type() === 'error') errors.console.push(message.text())
  })
  page.on('requestfailed', request => {
    const reason = request.failure()?.errorText || 'request failed'
    // Navigation/unmount aborts the previous viewer's fetch by design.  A
    // model that failed to load is still caught by the readiness assertion.
    if (/ERR_ABORTED|ERR_CANCELED/i.test(reason)) return
    errors.requests.push(`${request.method()} ${request.url()} · ${reason}`)
  })
  return errors
}

function errorCursor(errors) {
  return { page: errors.page.length, console: errors.console.length, requests: errors.requests.length }
}

function errorsSince(errors, cursor) {
  return {
    page: errors.page.slice(cursor.page),
    console: errors.console.slice(cursor.console),
    requests: errors.requests.slice(cursor.requests),
  }
}

function assertNoErrors(errors, label) {
  const messages = [
    ...errors.page.map(message => `pageerror: ${message}`),
    ...errors.console.map(message => `console.error: ${message}`),
    ...errors.requests.map(message => `requestfailed: ${message}`),
  ]
  assert.deepEqual(messages, [], `${label} emitted browser errors:\n${messages.join('\n')}`)
}

function errorMessage(error) {
  return error instanceof Error ? error.message || error.name : String(error)
}

function hasBrowserErrors(errors) {
  return errors.page.length > 0 || errors.console.length > 0 || errors.requests.length > 0
}

async function viewerState(page) {
  return page.$eval('body', body => {
    const statuses = [...body.querySelectorAll('[role="status"]')].map(item => item.textContent?.trim() || '')
    const canvas = body.querySelector('canvas[aria-label^="Interactive student model"]')
    const bounds = canvas?.getBoundingClientRect()
    const alert = body.querySelector('[role="alert"]')?.textContent?.trim() || null
    const active = [...body.querySelectorAll('[aria-label="Student animations"] button')]
      .find(button => button.getAttribute('aria-pressed') === 'true')
      ?.querySelector('span')?.textContent?.trim() || null
    return {
      ready: statuses.includes('Model ready'),
      status: statuses.find(status => status === 'Model ready' || status === 'Model unavailable') || null,
      canvas: Boolean(bounds && bounds.width > 100 && bounds.height > 100),
      error: alert,
      active,
    }
  })
}

async function waitForModelReady(page, student) {
  await page.waitForSelector('#chibi-search', { timeout: timeoutMs() })
  await page.waitForFunction(() => [...document.querySelectorAll('[role="status"]')]
    .some(item => ['Model ready', 'Model unavailable'].includes(item.textContent?.trim())), { timeout: timeoutMs() })
  const state = await viewerState(page)
  assert.equal(state.ready, true, `Student ${student.id} never reached Model ready: ${state.error || state.status || 'unknown viewer state'}.`)
  assert.equal(state.canvas, true, `Student ${student.id} has no usable model canvas.`)
  assert.equal(state.error, null, `Student ${student.id} reports a model error: ${state.error || 'unknown error'}`)
  const canvas = await page.$('canvas[aria-label^="Interactive student model"]')
  assert.ok(canvas, `Student ${student.id} has no interactive model canvas.`)
  const bounds = await canvas.boundingBox()
  assert.ok(bounds && bounds.width > 100 && bounds.height > 100, `Student ${student.id} model canvas is too small.`)
  return { canvas, bounds }
}

async function resetView(page) {
  const clicked = await page.$eval('body', body => {
    const button = [...body.querySelectorAll('button')].find(item => item.textContent?.trim() === 'Reset view')
    if (!button) return false
    button.click()
    return true
  })
  assert.equal(clicked, true, 'Viewer Reset view button is missing.')
  await pause(250)
}

async function captureOrientation(page, student, orientation, outputFile) {
  await resetView(page)
  const canvas = await page.$('canvas[aria-label^="Interactive student model"]')
  assert.ok(canvas, `Student ${student.id} has no canvas for ${orientation} capture.`)
  let bounds = await canvas.boundingBox()
  assert.ok(bounds && bounds.width > 100 && bounds.height > 100, `Student ${student.id} canvas is invalid for ${orientation} capture.`)
  if (orientation !== 'front') {
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2
    const delta = orientation === 'side' ? bounds.width * 0.28 : bounds.width * 0.4
    await page.mouse.move(centerX, centerY)
    await page.mouse.down()
    await page.mouse.move(centerX + delta, centerY - (orientation === 'rotated' ? bounds.height * 0.04 : 0), { steps: 12 })
    await page.mouse.up()
    await pause(350)
    bounds = await canvas.boundingBox()
  }
  assert.ok(bounds, `Student ${student.id} canvas disappeared during ${orientation} capture.`)
  await page.screenshot({ path: outputFile, clip: bounds })
  return { orientation, file: path.basename(outputFile), path: outputFile, width: bounds.width, height: bounds.height }
}

async function actionButtonState(page, label) {
  return page.$eval('[aria-label="Student animations"]', (element, actionLabel) => {
    const button = [...element.querySelectorAll('button')].find(item => item.querySelector('span')?.textContent?.trim() === actionLabel)
    return button
      ? { exists: true, disabled: button.disabled, title: button.title || null, pressed: button.getAttribute('aria-pressed') === 'true' }
      : { exists: false, disabled: true, title: 'Button missing.', pressed: false }
  }, label)
}

async function waitForAnimationFrames(page, count) {
  assert.ok(Number.isInteger(count) && count >= 1 && count <= 2, `Action capture frame wait must be one or two frames, got ${String(count)}.`)
  await page.evaluate(frameCount => new Promise(resolve => {
    let remaining = frameCount
    const tick = () => {
      remaining -= 1
      if (remaining <= 0) {
        resolve()
        return
      }
      window.requestAnimationFrame(tick)
    }
    window.requestAnimationFrame(tick)
  }), count)
}

async function waitForAuthoredDuration(page, startedAt, waitMs) {
  assert.ok(Number.isFinite(startedAt), 'Action capture has no browser activation timestamp.')
  assert.ok(Number.isInteger(waitMs) && waitMs > 0 && waitMs <= timeoutMs(), `Authored action capture duration ${String(waitMs)}ms exceeds the browser timeout budget.`)
  await page.waitForFunction(({ start, duration }) => performance.now() - start >= duration, { polling: 'raf', timeout: timeoutMs() }, { start: startedAt, duration: waitMs })
}

async function captureAction(page, student, action, outputFile, timing, startedAt) {
  const canvas = await page.$('canvas[aria-label^="Interactive student model"]')
  assert.ok(canvas, `Student ${student.id} has no canvas for ${action.id} capture.`)
  const bounds = await canvas.boundingBox()
  assert.ok(bounds && bounds.width > 100 && bounds.height > 100, `Student ${student.id} canvas is invalid for ${action.id} capture.`)
  if (timing.mode === 'duration') await waitForAuthoredDuration(page, startedAt, timing.waitMs)
  else await waitForAnimationFrames(page, timing.waitFrames)
  const active = await actionButtonState(page, action.label)
  assert.equal(active.pressed, true, `Student ${student.id} action ${action.id} was no longer active at capture time.`)
  await page.screenshot({ path: outputFile, clip: bounds })
  return { action: action.id, label: action.label, clip: action.clip, timing, file: path.basename(outputFile), path: outputFile, width: bounds.width, height: bounds.height }
}

async function exerciseAction(page, student, action, outputFile = null, timing = null) {
  const initial = await actionButtonState(page, action.label)
  assert.equal(initial.exists, true, `Student ${student.id} action ${action.id} button is missing.`)
  assert.equal(initial.disabled, false, `Student ${student.id} authored action ${action.id} is disabled: ${initial.title || 'no reason'}`)
  const startedAt = await page.$eval('[aria-label="Student animations"]', (element, actionLabel) => {
    const button = [...element.querySelectorAll('button')].find(item => item.querySelector('span')?.textContent?.trim() === actionLabel)
    if (!button) throw new Error(`Action button ${actionLabel} disappeared.`)
    button.click()
    return performance.now()
  }, action.label)
  await page.waitForFunction(label => [...document.querySelectorAll('[aria-label="Student animations"] button')]
    .some(item => item.querySelector('span')?.textContent?.trim() === label && item.getAttribute('aria-pressed') === 'true'), { timeout: timeoutMs() }, action.label)
  const activated = await actionButtonState(page, action.label)
  assert.equal(activated.pressed, true, `Student ${student.id} action ${action.id} never became active.`)
  // Capture while the authored action is active. Pickup waits through its
  // authored duration so the held final pose—not its initial pose—is reviewed.
  const screenshot = outputFile ? await captureAction(page, student, action, outputFile, timing, startedAt) : undefined

  if (action.loop || action.hold) {
    await pause(300)
    const settled = await actionButtonState(page, action.label)
    const state = await viewerState(page)
    return summarizeActionObservation(action.id, { ready: state.ready, canvas: state.canvas, error: state.error, activated: true, settled: settled.pressed, clip: action.clip, screenshot })
  }

  // Non-looping actions must complete and return control to the initial pose.
  // The viewer intentionally clears a finished touch action (or starts idle),
  // so this checks a real transition rather than merely a button click.
  await page.waitForFunction(label => ![...document.querySelectorAll('[aria-label="Student animations"] button')]
    .some(item => item.querySelector('span')?.textContent?.trim() === label && item.getAttribute('aria-pressed') === 'true'), { timeout: Math.max(timeoutMs(), 20_000) }, action.label)
  await pause(150)
  const state = await viewerState(page)
  return summarizeActionObservation(action.id, { ready: state.ready, canvas: state.canvas, error: state.error, activated: true, settled: true, clip: action.clip, screenshot })
}

async function runModelAcceptance(page, student, diagnostics, errors, mode) {
  assert.ok(student.model, `Student ${student.id} has no model to render.`)
  const screenshots = screenshotPlan(student)
  const actions = availableProfileActions(student.model.profile)
  const actionScreenshots = actionScreenshotPlan(student, actions)
  const cursor = errorCursor(errors)
  const requireFrozenBrowserProof = mode === 'full'
  const expectedAssetUrl = new URL(student.model.url, base).toString()
  const browserAssetTasks = []
  const onResponse = response => {
    if (!requireFrozenBrowserProof || response.url() !== expectedAssetUrl || response.request().method() !== 'GET') return
    browserAssetTasks.push((async () => {
      assert.equal(response.status(), 200, `Student ${student.id} Chromium GLB response returned HTTP ${response.status()}.`)
      const headers = response.headers()
      assert.equal(headers['content-type'], 'model/gltf-binary', `Student ${student.id} Chromium GLB response content type is unexpected.`)
      const bytes = await response.buffer()
      const sha256 = createHash('sha256').update(bytes).digest('hex')
      assert.equal(sha256, student.model.revision.toLowerCase(), `Student ${student.id} Chromium GLB response hash differs from its frozen revision.`)
      return {
        url: response.url(),
        method: response.request().method(),
        status: response.status(),
        contentType: headers['content-type'],
        byteLength: bytes.byteLength,
        sha256,
        fromCache: response.fromCache(),
      }
    })().then(value => ({ value }), error => ({ error: errorMessage(error) })))
  }
  if (requireFrozenBrowserProof) page.on('response', onResponse)
  let browserSelection
  let browserAssetResponses
  let canvas
  try {
    await page.goto(`${base}/3D?student=${encodeURIComponent(student.id)}`, { waitUntil: 'networkidle2', timeout: timeoutMs() })
    const ready = await waitForModelReady(page, student)
    canvas = ready.canvas
    if (requireFrozenBrowserProof) {
      await page.waitForFunction(browserSelectionMatchesStudent, { timeout: timeoutMs() }, student.id)
      const selectedUrl = new URL(page.url())
      assert.equal(selectedUrl.pathname, '/3D', `Student ${student.id} browser selection left the /3D route.`)
      assert.equal(selectedUrl.searchParams.get('student'), String(student.id), `Student ${student.id} browser route selected a different ID.`)
      const selectedRowId = await page.$eval('[aria-current="true"] span.font-mono', element => element.innerText?.trim() || '')
      assert.equal(selectedRowId, String(student.id), `Student ${student.id} is not the actual selected browser row.`)
      browserSelection = { studentId: student.id, route: selectedUrl.pathname, queryStudentId: selectedUrl.searchParams.get('student'), selectedRowId }
    }

    const captures = { actions: {} }
    for (const orientation of ['front', 'side', 'rotated']) {
      const file = screenshots[orientation]
      captures[orientation] = await captureOrientation(page, student, orientation, path.join(output, file))
    }
    const actionResults = []
    const actionFailures = []
    for (const action of actions) {
      const actionCursor = errorCursor(errors)
      try {
        // Every action frame is captured from the stable front view.  Reset also
        // releases a held pickup pose before the next authored action.
        await resetView(page)
        const outputFile = actionScreenshots[action.id] ? path.join(output, actionScreenshots[action.id]) : null
        const interaction = student.model.profile.interactions[action.id]
        const profileDuration = interaction && Number.isFinite(interaction.duration) ? interaction.duration : null
        const timing = outputFile
          ? resolveActionCaptureTiming(action, { profileDuration, clipDuration: diagnostics.animationDurations?.[action.clip] })
          : null
        const result = await exerciseAction(page, student, action, outputFile, timing)
        actionResults.push(result)
        if (result.screenshot) captures.actions[action.id] = result.screenshot
      } catch (error) {
        actionFailures.push({
          action: action.id,
          label: action.label,
          clip: action.clip,
          error: errorMessage(error),
          browserErrors: errorsSince(errors, actionCursor),
        })
      }
    }
    const state = await viewerState(page)
    assert.equal(state.ready, true, `Student ${student.id} lost model readiness after actions.`)
    assert.equal(state.canvas, true, `Student ${student.id} lost its model canvas after actions.`)
    const browserErrors = errorsSince(errors, cursor)
    if (requireFrozenBrowserProof) {
      const browserAssetResults = await Promise.all(browserAssetTasks)
      assert.ok(browserAssetResults.length > 0, `Student ${student.id} had no Chromium response for its exact frozen GLB URL.`)
      const browserAssetFailures = browserAssetResults.filter(result => result.error)
      assert.deepEqual(browserAssetFailures, [], `Student ${student.id} Chromium GLB response verification failed.`)
      browserAssetResponses = browserAssetResults.map(result => result.value)
    }
    return {
      studentId: student.id,
      name: student.name,
      mode,
      assetId: student.model.assetId,
      revision: student.model.revision,
      modelUrl: student.model.url,
      assetUrl: expectedAssetUrl,
      ...(requireFrozenBrowserProof ? { browserSelection, browserAssetResponses } : {}),
      screenshots: captures,
      actions: actionResults,
      actionFailures,
      authoredAvailableActions: actions.map(action => ({ id: action.id, clip: action.clip })),
      diagnostics,
      browserErrors,
      canvas: { ariaLabel: await canvas?.evaluate(element => element.getAttribute('aria-label')) },
    }
  } finally {
    if (requireFrozenBrowserProof) page.off('response', onResponse)
  }
}

async function runPilotSmoke(page, catalog, errors) {
  await page.goto(`${base}/3D?student=${PILOT_STUDENT_ID}`, { waitUntil: 'networkidle2', timeout: timeoutMs() })
  await page.waitForSelector('#chibi-search', { timeout: timeoutMs() })
  assert.ok((await page.$eval('main', element => element.innerText)).includes(String(PILOT_STUDENT_ID)))
  await page.screenshot({ path: path.join(output, 'roster.png'), fullPage: true })
  await page.goto(`${base}/3D?student=${PILOT_STUDENT_ID}&q=zzzz-no-student`, { waitUntil: 'networkidle2', timeout: timeoutMs() })
  assert.ok((await page.$eval('main', element => element.innerText)).includes('No students match these filters.'))
  await page.goto(`${base}/3D?student=9999`, { waitUntil: 'networkidle2', timeout: timeoutMs() })
  assert.ok((await page.$eval('main', element => element.innerText)).includes('Selection unavailable'))
  await page.goto(`${base}/3D?student=${PILOT_STUDENT_ID}`, { waitUntil: 'networkidle2', timeout: timeoutMs() })
  const first = catalog.find(student => student.id !== PILOT_STUDENT_ID)
  if (first) {
    await page.evaluate(id => {
      const button = [...document.querySelectorAll('[aria-label="Student results"] button')].find(item => item.innerText.includes(String(id)))
      if (!button) throw new Error('Student result missing')
      button.click()
    }, first.id)
    await page.waitForFunction(browserSelectionMatchesStudent, { timeout: timeoutMs() }, first.id)
    await page.goBack({ waitUntil: 'networkidle2', timeout: timeoutMs() })
    await page.waitForFunction(browserSelectionMatchesStudent, { timeout: timeoutMs() }, PILOT_STUDENT_ID)
    assert.equal(new URL(page.url()).searchParams.get('student'), String(PILOT_STUDENT_ID))
    await page.goForward({ waitUntil: 'networkidle2', timeout: timeoutMs() })
    await page.waitForFunction(browserSelectionMatchesStudent, { timeout: timeoutMs() }, first.id)
    assert.equal(new URL(page.url()).searchParams.get('student'), String(first.id))
  }
  await page.goto(`${base}/3D?student=${PILOT_STUDENT_ID}`, { waitUntil: 'networkidle2', timeout: timeoutMs() })
  await page.click('#chibi-search')
  await page.keyboard.type('hoshino')
  await page.waitForFunction(() => document.querySelector('#chibi-search')?.value === 'hoshino' && new URL(location.href).searchParams.get('q') === 'hoshino', { timeout: timeoutMs() })
  assertNoErrors(errors, 'Pilot smoke checks')
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('Browser mode defaults to pilot. Set CHIBI_BROWSER_MODE=full (or pass --full) to require and exercise every published catalog model on isolated port 3102. Screenshots and results are written below CHIBI_TEST_OUTPUT_DIR.')
    return
  }
  const mode = requestedMode()
  const catalog = await fetchCatalog()
  assert.ok(!JSON.stringify(catalog).includes('fileKey'))
  assert.ok(!JSON.stringify(catalog).includes('Development_data'))
  assert.deepEqual(catalog.filter(student => student.status !== 'viewable' || !student.model), [], 'Public Chibi catalog must contain successfully imported/viewable students only.')
  const plan = planBrowserRoster(catalog, mode)
  const unauthorizedRoutes = await assertProtectedRoutes()
  const browserTimeoutMs = timeoutMs()
  const browser = await puppeteer.launch({ headless: true, protocolTimeout: browserTimeoutMs, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 1080, deviceScaleFactor: 1 })
  if (mode === 'full') await page.setCacheEnabled(false)
  const errors = installBrowserErrorCapture(page)
  const results = []
  const modelFailures = []
  const actionFailures = []
  const runtimeFailures = []
  try {
    if (mode === 'pilot') await runPilotSmoke(page, catalog, errors)
    for (const student of plan.students) {
      if (!student.model) continue
      const cursor = errorCursor(errors)
      try {
        const diagnostics = await fetchCharacterDiagnostics(student)
        const latest = await runModelAcceptance(page, student, diagnostics, errors, mode)
        const checkpoint = await writeCharacterCheckpoint(latest, mode)
        results.push(latest)
        for (const failure of latest.actionFailures) actionFailures.push({ studentId: student.id, name: student.name, ...failure })
        if (hasBrowserErrors(latest.browserErrors)) runtimeFailures.push({ studentId: student.id, name: student.name, browserErrors: latest.browserErrors })
        console.log(JSON.stringify({ studentId: student.id, name: student.name, assetId: latest.assetId, revision: latest.revision, actions: latest.actions.length, actionFailures: latest.actionFailures.length, screenshots: latest.screenshots, exclusions: diagnostics.excludedRenderers.length, equipment: diagnostics.equipment.references.length, checkpoint }))
      } catch (error) {
        const failure = {
          studentId: student.id,
          name: student.name,
          modelUrl: student.model.url,
          error: errorMessage(error),
          browserErrors: errorsSince(errors, cursor),
        }
        const checkpoint = await writeCharacterCheckpoint({ ...failure, outcome: 'failed' }, mode)
        modelFailures.push(failure)
        console.error(JSON.stringify({ ...failure, checkpoint }))
      }
    }
    const screenshotCount = results.reduce((count, result) => count + 3 + Object.keys(result.screenshots.actions ?? {}).length, 0)
    const failed = modelFailures.length > 0 || actionFailures.length > 0 || runtimeFailures.length > 0 || hasBrowserErrors(errors)
    const report = {
      origin: base,
      mode,
      status: failed ? 'failed' : 'passed',
      generatedAt: new Date().toISOString(),
      eligible: catalog.length,
      viewable: catalog.filter(student => student.model && student.status === 'viewable').length,
      testedModels: results.length,
      attemptedModels: plan.students.filter(student => student.model).length,
      screenshotCount,
      blockedCatalogRows: plan.blocked.map(student => ({ id: student.id, name: student.name, status: student.status, diagnostic: student.diagnostic || null })),
      unauthorizedRoutes,
      browserChecks: mode === 'pilot'
        ? ['catalog', 'protected routes', 'Haruna deep link', 'empty search', 'invalid ID', 'history back/forward', 'rapid search typing', 'model readiness', 'policy diagnostics', 'front/side/rotated idle captures', 'authored action transitions and available action captures']
        : ['catalog', 'protected routes', 'full published roster model readiness', 'per-row browser selection identity', 'Chromium GLB response body SHA-256', 'policy diagnostics', 'core equipment retention', 'front/side/rotated idle captures', 'authored action transitions and available action captures'],
      results,
      modelFailures,
      actionFailures,
      runtimeFailures,
      pageErrors: errors.page,
      consoleErrors: errors.console,
      requestFailures: errors.requests,
    }
    const reportPath = path.join(output, 'results.json')
    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
    console.log(JSON.stringify({ reportPath, mode, status: report.status, eligible: catalog.length, attemptedModels: report.attemptedModels, testedModels: results.length, modelFailures: modelFailures.length, actionFailures: actionFailures.length, runtimeFailures: runtimeFailures.length, screenshots: screenshotCount, pageErrors: errors.page, consoleErrors: errors.console, requestFailures: errors.requests }, null, 2))
    assert.equal(modelFailures.length, 0, `Browser checks could not load or render ${modelFailures.length} published model(s). See ${reportPath}.`)
    assert.equal(actionFailures.length, 0, `Browser checks could not complete ${actionFailures.length} authored action(s). See ${reportPath}.`)
    assert.equal(runtimeFailures.length, 0, `Browser checks recorded runtime errors for ${runtimeFailures.length} model(s). See ${reportPath}.`)
    if (mode === 'full') assert.equal(results.length, plan.students.length, `Full-roster browser acceptance rendered ${results.length} of ${plan.students.length} catalog models. See ${reportPath}.`)
    assertNoErrors(errors, `${mode} roster checks`)
  } finally {
    await browser.close()
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch(error => { console.error(error instanceof Error ? error.stack || error.message : error); process.exitCode = 1 })
}
