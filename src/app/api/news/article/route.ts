import { jsonWithPublicCache } from '@/lib/cache'
import { getOfficialNewsArticle, isNewsServer, NewsUpstreamError } from '@/lib/blue-archive-news'

export const dynamic = 'force-dynamic'
const ARTICLE_CACHE_CONTROL = 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id') || ''
  const server = searchParams.get('server') || ''

  if (!/^\d{1,20}$/.test(id)) {
    return jsonWithPublicCache({ error: 'Invalid official news article.' }, { status: 400 })
  }
  if (!isNewsServer(server)) {
    return jsonWithPublicCache({ error: 'Unsupported news server.' }, { status: 400 })
  }

  try {
    const response = jsonWithPublicCache(await getOfficialNewsArticle(id, server))
    response.headers.set('Cache-Control', ARTICLE_CACHE_CONTROL)
    return response
  } catch (error) {
    if (error instanceof NewsUpstreamError) {
      return jsonWithPublicCache({ error: error.message }, { status: 502 })
    }
    return jsonWithPublicCache({ error: 'Official news is temporarily unavailable.' }, { status: 502 })
  }
}
