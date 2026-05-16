import { getNextBirthdayRefreshAt } from '@/lib/birthdays'
import { birthdayCacheControl, jsonWithPublicCache } from '@/lib/cache'
import { getCurrentBirthdayDay, getPublicBirthdayStudents } from '@/lib/public-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  const birthdayDay = getCurrentBirthdayDay()
  const nextRefreshAt = getNextBirthdayRefreshAt()
  const response = jsonWithPublicCache({
    birthdayKey: birthdayDay.key,
    nextRefreshAt: nextRefreshAt.toISOString(),
    students: await getPublicBirthdayStudents(birthdayDay.key),
  })

  response.headers.set('Cache-Control', birthdayCacheControl(nextRefreshAt))
  return response
}
