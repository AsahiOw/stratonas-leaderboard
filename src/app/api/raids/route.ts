import { jsonWithPublicCache } from '@/lib/cache'
import { getPublicRaids } from '@/lib/public-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  return jsonWithPublicCache(await getPublicRaids())
}
