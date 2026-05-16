import { jsonWithPublicCache } from '@/lib/cache'
import { getPublicStats } from '@/lib/public-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  return jsonWithPublicCache(await getPublicStats())
}
