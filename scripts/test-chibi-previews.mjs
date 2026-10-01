import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import bcrypt from 'bcryptjs'
import puppeteer from 'puppeteer'
import { prisma } from '../src/lib/prisma'

const base = process.env.CHIBI_TEST_ORIGIN || 'http://localhost:3000'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Preview screenshots run against local development only.')
const jobIds = process.argv.slice(2).filter(Boolean)
assert.ok(jobIds.length, 'Pass one or more completed private preview job IDs.')
const output = path.resolve('Development_data/chibi/reports/previews')
await fs.mkdir(output, { recursive: true })

const password = randomUUID()
const user = await prisma.user.create({ data: {
  email: `chibi-preview-review-${randomUUID()}@local.invalid`,
  name: 'Chibi preview review (temporary)',
  role: 'ADMIN',
  passwordHash: await bcrypt.hash(password, 10),
} })
const browser = await puppeteer.launch({
  headless: true,
  args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 1080, deviceScaleFactor: 1 })
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.goto(`${base}/login`, { waitUntil: 'networkidle2' })
  await page.type('input[type="email"]', user.email)
  await page.type('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForFunction(() => !location.pathname.includes('login'))

  const results = []
  for (const jobId of jobIds) {
    await page.goto(`${base}/admin/chibi/preview?job=${encodeURIComponent(jobId)}`, { waitUntil: 'networkidle2' })
    await page.waitForSelector('[aria-label="Student animations"]', { timeout: 90_000 })
    await page.waitForFunction(() => [...document.querySelectorAll('[role="status"]')].some(item => item.textContent?.trim() === 'Model ready'), { timeout: 90_000 })
    const identity = await page.$eval('main p', element => element.textContent?.trim() ?? '')
    const safeIdentity = identity.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
    const screenshot = async suffix => page.screenshot({ path: path.join(output, `${safeIdentity}-${suffix}.png`), fullPage: true })
    await screenshot('front-initial')

    const canvas = await page.$('canvas[aria-label^="Interactive student model"]')
    assert.ok(canvas, `Preview ${jobId} did not create the interactive model canvas.`)
    const bounds = await canvas.boundingBox()
    assert.ok(bounds && bounds.width > 100 && bounds.height > 100, `Preview ${jobId} canvas has invalid bounds.`)
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    await page.mouse.down()
    await page.mouse.move(bounds.x + bounds.width / 2 + bounds.width * 0.28, bounds.y + bounds.height / 2, { steps: 12 })
    await page.mouse.up()
    await new Promise(resolve => setTimeout(resolve, 400))
    await screenshot('side-initial')

    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    await page.mouse.down()
    await page.mouse.move(bounds.x + bounds.width / 2 + bounds.width * 0.12, bounds.y + bounds.height / 2 - bounds.height * 0.04, { steps: 10 })
    await page.mouse.up()
    await new Promise(resolve => setTimeout(resolve, 400))
    await screenshot('rotated-initial')

    await page.evaluate(() => {
      const button = [...document.querySelectorAll('button')].find(item => item.textContent?.trim() === 'Reset view')
      if (!button) throw new Error('Preview reset button is missing.')
      button.click()
    })
    await new Promise(resolve => setTimeout(resolve, 400))
    const touchState = await page.$eval('[aria-label="Student animations"]', element => {
      const button = [...element.querySelectorAll('button')].find(item => item.querySelector('span')?.textContent?.trim() === 'Touch')
      if (!button) throw new Error('Preview Touch interaction button is missing.')
      return { disabled: button.disabled, reason: button.title || null }
    })
    if (!touchState.disabled) {
      await page.$eval('[aria-label="Student animations"]', element => {
        const button = [...element.querySelectorAll('button')].find(item => item.querySelector('span')?.textContent?.trim() === 'Touch')
        button?.click()
      })
      await new Promise(resolve => setTimeout(resolve, 650))
      await screenshot('front-touch')
    }
    const actions = await page.$$eval('[aria-label="Student animations"] button', buttons => buttons.map(button => ({
      label: button.querySelector('span')?.textContent?.trim() ?? button.textContent?.trim() ?? '',
      disabled: button.disabled,
      reason: button.title || null,
      active: button.getAttribute('aria-pressed') === 'true',
    })))
    const interactionMatrix = []
    for (const view of ['front', 'side', 'rotated']) {
      await page.evaluate(() => document.querySelector('button') && [...document.querySelectorAll('button')].find(item => item.textContent?.trim() === 'Reset view')?.click())
      await new Promise(resolve => setTimeout(resolve, 300))
      if (view !== 'front') {
        await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
        await page.mouse.down()
        const horizontal = view === 'side' ? 0.28 : 0.4
        const vertical = view === 'rotated' ? 0.04 : 0
        await page.mouse.move(bounds.x + bounds.width / 2 + bounds.width * horizontal, bounds.y + bounds.height / 2 - bounds.height * vertical, { steps: 12 })
        await page.mouse.up()
        await new Promise(resolve => setTimeout(resolve, 350))
      }
      for (const label of ['Walk', 'Pick up', 'Touch']) {
        const state = await page.$eval('[aria-label="Student animations"]', (element, actionLabel) => {
          const button = [...element.querySelectorAll('button')].find(item => item.querySelector('span')?.textContent?.trim() === actionLabel)
          return button ? { disabled: button.disabled, reason: button.title || null } : { disabled: true, reason: 'Interaction button is missing.' }
        }, label)
        if (state.disabled) {
          interactionMatrix.push({ view, label, ...state, screenshot: null })
          continue
        }
        await page.$eval('[aria-label="Student animations"]', (element, actionLabel) => {
          [...element.querySelectorAll('button')].find(item => item.querySelector('span')?.textContent?.trim() === actionLabel)?.click()
        }, label)
        await new Promise(resolve => setTimeout(resolve, label === 'Walk' ? 700 : 850))
        const active = await page.$eval('[aria-label="Student animations"]', (element, actionLabel) => {
          const button = [...element.querySelectorAll('button')].find(item => item.querySelector('span')?.textContent?.trim() === actionLabel)
          return button?.getAttribute('aria-pressed') === 'true'
        }, label)
        const viewAction = `${safeIdentity}-${view}-${label.toLowerCase().replaceAll(' ', '-')}.png`
        await page.screenshot({ path: path.join(output, viewAction), fullPage: true })
        interactionMatrix.push({ view, label, ...state, active, screenshot: viewAction })
        await page.$eval('[aria-label="Student animations"]', element => {
          [...element.querySelectorAll('button')].find(item => item.querySelector('span')?.textContent?.trim() === 'Standing idle')?.click()
        })
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }
    results.push({ jobId, identity, screenshots: { front: `${safeIdentity}-front-initial.png`, side: `${safeIdentity}-side-initial.png`, rotated: `${safeIdentity}-rotated-initial.png`, expression: touchState.disabled ? null : `${safeIdentity}-front-touch.png` }, touch: touchState, actions, interactionMatrix })
  }
  assert.deepEqual(pageErrors, [], `Preview browser errors: ${pageErrors.join('; ')}`)
  const report = { origin: base, generatedAt: new Date().toISOString(), previews: results, pageErrors }
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally {
  await browser.close()
  await prisma.user.delete({ where: { id: user.id } })
  await prisma.$disconnect()
}
