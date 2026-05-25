import { getBirthdayDay, getNextBirthdayRefreshAt } from '@/lib/birthdays'
import { birthdayCacheControl, jsonWithPublicCache } from '@/lib/cache'
import { getPublicUpcomingBirthdayStudents } from '@/lib/public-data'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const take = Math.max(1, Math.min(Number(url.searchParams.get('take')) || 8, 16))
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
