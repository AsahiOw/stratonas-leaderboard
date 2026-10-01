import 'dotenv/config'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer'
import {
  assertAcceptanceEnvironment,
  assertBaadSource,
  assertOutputEmpty,
  assertSafeOutputPath,
  pathsOverlap,
} from './chibi-acceptance-guards'

async function main() {
  const base = process.env.CHIBI_TEST_ORIGIN || 'http://localhost:3000'
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Admin smoke checks run against local development only.')
  const email = process.env.CHIBI_TEST_EMAIL?.trim()
  const password = process.env.CHIBI_TEST_PASSWORD
  assert.ok(email && password, 'Set CHIBI_TEST_EMAIL and CHIBI_TEST_PASSWORD to an existing local admin. This smoke test never creates or deletes database users.')
  const output = process.env.CHIBI_TEST_OUTPUT_DIR ? assertSafeOutputPath('CHIBI_TEST_OUTPUT_DIR', process.env.CHIBI_TEST_OUTPUT_DIR) : null
  const triggerImport = process.env.CHIBI_TEST_TRIGGER_IMPORT === 'true'
  if (triggerImport) {
    assert.equal(process.env.CHIBI_TEST_ISOLATED, 'true', 'CHIBI_TEST_TRIGGER_IMPORT=true requires CHIBI_TEST_ISOLATED=true.')
    const isolated = assertAcceptanceEnvironment({
      sourceDir: process.env.CHIBI_SOURCE_DIR,
      dataDir: process.env.CHIBI_DATA_DIR,
      toolsDir: process.env.CHIBI_TOOLS_DIR,
      databaseUrl: process.env.DATABASE_URL,
      allowTestDatabase: true,
    })
    assert.equal(process.env.CHIBI_SOURCE_READ_ONLY, 'true', 'Import-trigger mode requires CHIBI_SOURCE_READ_ONLY=true after the supplied BAAD tree is mounted or ACL-protected read-only.')
    if (output) {
      assert.ok(!pathsOverlap(output, isolated.dataDir), 'CHIBI_TEST_OUTPUT_DIR must not be inside CHIBI_DATA_DIR.')
      assert.ok(!pathsOverlap(output, isolated.sourceDir!), 'CHIBI_TEST_OUTPUT_DIR must not be inside CHIBI_SOURCE_DIR.')
    }
    await assertBaadSource(isolated.sourceDir!)
    await assertOutputEmpty(isolated.dataDir)
    const databaseUrl = process.env.CHIBI_TEST_DATABASE_URL
    assert.ok(databaseUrl && databaseUrl === process.env.DATABASE_URL, 'Import-trigger mode requires CHIBI_TEST_DATABASE_URL to match the app DATABASE_URL.')
  }
  if (output) await mkdir(output, { recursive: true })
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 1080, deviceScaleFactor: 1 })
    await page.goto(`${base}/login`, { waitUntil: 'networkidle2' })
    await page.type('input[type="email"]', email)
    await page.type('input[type="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForFunction(() => !location.pathname.includes('login'))
    await page.goto(`${base}/admin`, { waitUntil: 'networkidle2' })
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.innerText.trim() === 'Chibi'))
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.innerText.trim() === 'Chibi')!.click())
    await page.waitForSelector('#chibi-admin-search')
    await page.waitForFunction(() => document.body.innerText.includes('eligible students'))
    const roster = await page.evaluate(async () => {
      const response = await fetch('/api/admin/chibi/students')
      return { status: response.status, body: await response.json() }
    })
    assert.equal(roster.status, 200)
    assert.ok(roster.body.students.length > 0)
    const validation = await page.evaluate(async () => {
      const response = await fetch('/api/admin/chibi/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'force-rebuild', studentIds: [] }) })
      return { status: response.status, body: await response.json() }
    })
    assert.equal(validation.status, 400)
    await page.type('#chibi-admin-search', '10002')
    await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 1)
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.innerText === 'Review mapping')!.click())
    await page.waitForSelector('[aria-label="Mapping review"]')
    await page.waitForFunction(() => {
      const portrait = document.querySelector<HTMLImageElement>('[aria-label="Mapping review"] img')
      return !!portrait?.complete && portrait.naturalWidth > 0
    })
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.innerText === 'Hang up')?.click())
    assert.ok((await page.$eval('[aria-label="Mapping review"]', element => element.textContent)).includes('10002'))
    let queuedImport: string | null = null
    if (triggerImport) {
      await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.innerText.trim() === 'Import / Update' && !(button as HTMLButtonElement).disabled)?.click())
      await page.waitForFunction(() => document.body.innerText.includes('Queued update ·'))
      queuedImport = await page.$eval('[role="status"]', element => element.textContent?.match(/Queued update · (\S+)/)?.[1] || null)
      assert.ok(queuedImport, 'Import / Update did not return a job id.')
    }
    if (output) await page.screenshot({ path: path.join(output, 'admin-review.png'), fullPage: true })
    const report = { authenticatedRoster: roster.status, eligible: roster.body.students.length, invalidForceRebuild: validation.status, mappingReview: 'rendered', importUpdate: triggerImport ? { status: 'queued', jobId: queuedImport } : 'not-triggered', databaseWrites: triggerImport ? 'isolated-job-only' : 'none', output: output || 'none' }
    if (output) await writeFile(path.join(output, 'admin-results.json'), JSON.stringify(report, null, 2))
    console.log(JSON.stringify(report, null, 2))
  } finally {
    await browser.close()
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
