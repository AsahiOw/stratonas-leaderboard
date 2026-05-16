import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export const PUBLIC_DATA_REVALIDATE_SECONDS = 60
export const PUBLIC_DATA_STALE_SECONDS = 300

export const PUBLIC_CACHE_TAGS = {
  raids: 'public:raids',
  raidEntries: 'public:raid-entries',
  raidBosses: 'public:raid-bosses',
  players: 'public:players',
  stats: 'public:stats',
  students: 'public:students',
  birthdays: 'public:birthdays',
} as const

export const PUBLIC_CACHE_CONTROL =
  `public, max-age=0, s-maxage=${PUBLIC_DATA_REVALIDATE_SECONDS}, stale-while-revalidate=${PUBLIC_DATA_STALE_SECONDS}`

export const PRIVATE_NO_STORE = 'private, no-store, max-age=0, must-revalidate'

export function jsonWithPublicCache<T>(body: T, init?: ResponseInit) {
  const response = NextResponse.json(body, init)
  response.headers.set('Cache-Control', PUBLIC_CACHE_CONTROL)
  return response
}

export function jsonWithNoStore<T>(body: T, init?: ResponseInit) {
  const response = NextResponse.json(body, init)
  response.headers.set('Cache-Control', PRIVATE_NO_STORE)
  return response
}

export function birthdayCacheControl(nextRefreshAt: Date, now = new Date()) {
  const secondsUntilRefresh = Math.max(1, Math.ceil((nextRefreshAt.getTime() - now.getTime()) / 1000))
  return `public, max-age=${secondsUntilRefresh}, s-maxage=${secondsUntilRefresh}, stale-while-revalidate=60`
}

export function invalidatePublicData(tags: string[] = Object.values(PUBLIC_CACHE_TAGS)) {
  tags.forEach((tag) => {
    try {
      revalidateTag(tag, { expire: 0 })
    } catch (error) {
      console.warn(`Unable to revalidate cache tag "${tag}"`, error)
    }
  })
}
