import { jsonWithPublicCache } from '@/lib/cache'
import { getPublicFutureRecruitment } from '@/lib/public-data'
import { dateKeyFromDate, isValidDateKey } from '@/lib/recruitments'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const requestedTodayKey = new URL(req.url).searchParams.get('todayKey')
  const todayKey = requestedTodayKey && isValidDateKey(requestedTodayKey)
    ? requestedTodayKey
    : dateKeyFromDate()

  return jsonWithPublicCache(await getPublicFutureRecruitment(todayKey))
}
