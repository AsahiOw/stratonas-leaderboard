import { jsonWithPublicCache } from '@/lib/cache'
import { getPublicFutureRecruitment } from '@/lib/public-data'
import { dateKeyFromDate } from '@/lib/recruitments'

export const dynamic = 'force-dynamic'

export async function GET() {
  return jsonWithPublicCache(await getPublicFutureRecruitment(dateKeyFromDate()))
}
