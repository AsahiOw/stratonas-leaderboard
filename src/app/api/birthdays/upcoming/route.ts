import { getBirthdayDay, getNextBirthdayRefreshAt } from '@/lib/birthdays'
import { birthdayCacheControl, jsonWithPublicCache } from '@/lib/cache'
import { getPublicUpcomingBirthdayStudents } from '@/lib/public-data'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const takeParam = url.searchParams.get('take')
  const parsedTake = Number(takeParam)
  const take = takeParam && Number.isFinite(parsedTake) ? Math.max(1, parsedTake) : undefined
  const maxDays = Math.max(1, Math.min(Number(url.searchParams.get('days')) || 60, 366))
  const birthdayDay = getBirthdayDay()
  const nextRefreshAt = getNextBirthdayRefreshAt()
  const response = jsonWithPublicCache({
    birthdayKey: birthdayDay.key,
    nextRefreshAt: nextRefreshAt.toISOString(),
    maxDays,
    students: await getPublicUpcomingBirthdayStudents(birthdayDay.key, take, maxDays),
  })

  response.headers.set('Cache-Control', birthdayCacheControl(nextRefreshAt))
  return response
}
