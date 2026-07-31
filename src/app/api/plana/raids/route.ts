import { jsonWithPublicCache } from '@/lib/cache'
import { getPlanaRaidCatalog } from '@/lib/plana-public'

export const dynamic = 'force-dynamic'

export async function GET() {
  return jsonWithPublicCache(await getPlanaRaidCatalog())
}
