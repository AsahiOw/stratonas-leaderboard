import fs from 'fs/promises'
import path from 'path'
import puppeteer from 'puppeteer'
import { prisma } from '../src/lib/prisma'
import { normalizeStudentName } from '../src/lib/students'

type MemorialImage = {
  fileName: string
  studentName: string
  pageUrl: string
  imageUrl: string
}

const CATEGORY_URL = 'https://bluearchive.wiki/wiki/Category:Memorial_lobby_images'
const OUTPUT_PATH = path.join(process.cwd(), 'Development_data', 'memorial-lobbies.json')
const UPDATE_DB = process.argv.includes('--update-db')
const HEADLESS = process.env.HEADLESS === 'true'
const STEP_DELAY_MS = Number(process.env.SCRAPE_DELAY_MS || 350)
const CHALLENGE_WAIT_MS = Number(process.env.CHALLENGE_WAIT_MS || 180_000)

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function absoluteWikiUrl(value: string) {
  return new URL(value, CATEGORY_URL).toString()
}

function parseStudentName(fileName: string) {
  return decodeURIComponent(fileName)
    .replace(/^File:/, '')
    .replace(/^Memorial[_ ]Lobby[_ ]/i, '')
    .replace(/\.[^.]+$/, '')
    .replace(/_/g, ' ')
    .trim()
}

async function waitForWikiContent(page: import('puppeteer').Page, selector: string) {
  const startedAt = Date.now()
  let prompted = false

  while (Date.now() - startedAt < CHALLENGE_WAIT_MS) {
    const state = await page.evaluate((contentSelector) => {
      const text = document.body?.innerText || ''
      const title = document.title || ''
      return {
        hasContent: Boolean(document.querySelector(contentSelector)),
        isChallenge: /checking your connection|enable javascript and cookies/i.test(`${title}\n${text}`),
      }
    }, selector)

    if (state.hasContent && !state.isChallenge) return

    if (state.isChallenge && !prompted) {
      console.log('Miraheze is showing a connection check. Complete it in the opened browser; scraping will resume automatically.')
      prompted = true
    }

    await sleep(1000)
  }

  throw new Error('Timed out waiting for Blue Archive Wiki content. Try rerunning after completing the browser connection check.')
}

async function collectFilePageUrls(page: Awaited<ReturnType<typeof puppeteer.launch>> extends infer _ ? import('puppeteer').Page : never) {
  const fileUrls = await page.$$eval('a[href*="/wiki/File:"]', (anchors) => {
    return anchors
      .map((anchor) => (anchor as HTMLAnchorElement).href)
      .filter((href) => /\/wiki\/File:Memorial[_%20 ]Lobby/i.test(href))
  })
  return Array.from(new Set(fileUrls)).map(absoluteWikiUrl)
}

async function findNextCategoryPage(page: import('puppeteer').Page) {
  const nextHref = await page.$$eval('a', (anchors) => {
    const next = anchors.find((anchor) => anchor.textContent?.trim().toLowerCase() === 'next page')
    return next ? (next as HTMLAnchorElement).href : null
  })
  return nextHref ? absoluteWikiUrl(nextHref) : null
}

async function collectAllFilePages(page: import('puppeteer').Page) {
  const filePages = new Set<string>()
  let nextUrl: string | null = CATEGORY_URL

  while (nextUrl) {
    console.log(`Reading category page: ${nextUrl}`)
    await page.goto(nextUrl, { waitUntil: 'domcontentloaded', timeout: 90_000 })
    await page.waitForSelector('body', { timeout: 90_000 })
    await waitForWikiContent(page, 'a[href*="/wiki/File:Memorial"]')

    const urls = await collectFilePageUrls(page)
    urls.forEach((url) => filePages.add(url))

    nextUrl = await findNextCategoryPage(page)
    await sleep(STEP_DELAY_MS)
  }

  return Array.from(filePages).sort()
}

async function scrapeOriginalImageUrl(page: import('puppeteer').Page, pageUrl: string) {
  await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 90_000 })
  await page.waitForSelector('body', { timeout: 90_000 })
  await waitForWikiContent(page, '.fullMedia a, #file img, #file a')

  const imageUrl = await page.evaluate(() => {
    const fullMedia = document.querySelector<HTMLAnchorElement>('.fullMedia a')
    if (fullMedia?.href) return fullMedia.href

    const fileAnchor = document.querySelector<HTMLAnchorElement>('#file a')
    if (fileAnchor?.href) return fileAnchor.href

    const fileImage = document.querySelector<HTMLImageElement>('#file img')
    if (fileImage?.src) return fileImage.src

    return null
  })

  if (!imageUrl) return null

  const fileName = decodeURIComponent(pageUrl.split('/wiki/').pop() || '').replace(/_/g, ' ')
  return {
    fileName,
    studentName: parseStudentName(fileName),
    pageUrl,
    imageUrl,
  } satisfies MemorialImage
}

async function updateStudents(memorials: MemorialImage[]) {
  const students = await prisma.student.findMany({ select: { id: true, name: true } })
  const memorialByName = new Map(
    memorials.map((image) => [normalizeStudentName(image.studentName), image.imageUrl])
  )

  let matched = 0
  for (const student of students) {
    const memorial = memorialByName.get(normalizeStudentName(student.name))
    if (!memorial) continue
    await prisma.student.update({
      where: { id: student.id },
      data: { memorial },
    })
    matched += 1
  }

  return { matched, totalStudents: students.length }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    defaultViewport: { width: 1280, height: 900 },
  })

  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(90_000)

    console.log('A browser window will open. If Miraheze shows a connection check, complete it in that browser.')
    const filePages = await collectAllFilePages(page)
    console.log(`Found ${filePages.length} memorial file pages.`)

    const memorials: MemorialImage[] = []
    for (let i = 0; i < filePages.length; i += 1) {
      const pageUrl = filePages[i]
      const image = await scrapeOriginalImageUrl(page, pageUrl)
      if (image) memorials.push(image)
      console.log(`[${i + 1}/${filePages.length}] ${image?.studentName || 'Skipped'}`)
      await sleep(STEP_DELAY_MS)
    }

    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(memorials, null, 2), 'utf8')
    console.log(`Wrote ${memorials.length} memorial image links to ${OUTPUT_PATH}`)

    if (UPDATE_DB) {
      const result = await updateStudents(memorials)
      console.log(`Updated ${result.matched}/${result.totalStudents} students with matched memorial URLs.`)
    }
  } finally {
    await browser.close()
    await prisma.$disconnect()
  }
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
