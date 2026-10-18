import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer'

const origin = process.env.PLAYER_MERGE_TEST_ORIGIN || 'http://127.0.0.1:3000'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
const output = path.resolve('Development_data/player-merge-test')
await fs.mkdir(output, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
try {
  const page = await browser.newPage()
  page.setDefaultTimeout(60000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  let merged = false
  let submitted = null
  const players = [
    { id: 'old', ign: 'Same player old', username: 'old_account', userID: '111', isGuildMember: false },
    { id: 'new', ign: 'Same player new', username: 'new_account', userID: '222', isGuildMember: false },
  ]
  await page.setRequestInterception(true)
  page.on('request', request => {
    const url = new URL(request.url())
    let data
    if (url.pathname === '/api/auth/session') data = { user: { id: 'test-admin', name: 'Test admin', role: 'ADMIN' }, expires: '2099-01-01T00:00:00Z' }
    else if (url.pathname === '/api/admin/players/merge') {
      submitted = JSON.parse(request.postData())
      merged = true
      data = { transferredEntries: 2, skippedEntries: 1, transferredReviews: 1 }
    } else if (url.pathname === '/api/admin/players') data = merged ? players.slice(1) : players
    else if (url.pathname === '/api/admin/dashboard') data = { counts: {}, recentActivity: [], recentEntries: [], activityPage: { hasMore: false, nextCursor: null } }
    else if (url.pathname === '/api/admin/raid-lookups') data = { types: [], servers: [], terrains: [] }
    else if (url.pathname.startsWith('/api/admin/')) data = []
    if (data !== undefined) void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(data) })
    else void request.continue()
  })
  const click = async text => {
    await page.waitForFunction(text => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === text && !button.disabled), {}, text)
    await page.evaluate(text => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === text)?.click(), text)
  }
  await page.setViewport({ width: 1366, height: 900 })
  await page.goto(`${origin}/admin`, { waitUntil: 'domcontentloaded' })
  await click('Players')
  await click('Merge / Sync')
  const oldSelector = '[aria-label="Old account to delete"]'
  const newSelector = '[aria-label="New account to keep"]'
  await page.waitForSelector(oldSelector)
  assert.equal(await page.$eval('button[type=submit]', button => button.disabled), true)
  await page.select(oldSelector, 'old')
  assert.equal(await page.$$eval(`${newSelector} option`, options => options.some(option => option.value === 'old')), false)
  await page.type('[aria-label="Find merge accounts"]', 'new_account')
  assert.equal(await page.$eval(oldSelector, select => select.value), 'old')
  assert.equal(await page.$eval(newSelector, select => select.value), '')
  await page.select(newSelector, 'new')
  await page.screenshot({ path: path.join(output, 'desktop.png') })
  await page.setViewport({ width: 375, height: 812 })
  await page.screenshot({ path: path.join(output, 'mobile.png') })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  await click('Sync and delete old account')
  await page.waitForFunction(() => !document.querySelector('[aria-label="Old account to delete"]'))
  assert.deepEqual(submitted, { sourcePlayerId: 'old', targetPlayerId: 'new' })
  assert.deepEqual(errors, [])
  console.log(`Merge dialog checks passed on desktop and mobile. Screenshots: ${output}`)
} finally {
  await browser.close()
}
