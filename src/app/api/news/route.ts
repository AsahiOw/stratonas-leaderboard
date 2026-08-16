import { jsonWithPublicCache } from '@/lib/cache'
import { getOfficialJpNews, getOfficialNews, isNewsCategory, isNewsServer, NewsUpstreamError } from '@/lib/blue-archive-news'
import { getStoredXNews } from '@/lib/x-news'

export const dynamic = 'force-dynamic'
const NEWS_CACHE_CONTROL = 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400'
const X_NEWS_CACHE_CONTROL = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300'

function newsResponse(body: Awaited<ReturnType<typeof getOfficialNews>>) {
  const response = jsonWithPublicCache(body)
  response.headers.set('Cache-Control', NEWS_CACHE_CONTROL)
  return response
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const pageValue = searchParams.get('page') || '1'
  const category = searchParams.get('category') || 'all'
  const server = searchParams.get('server') || 'global'
  const limitValue = searchParams.get('limit') || '12'
  const page = Number(pageValue)
  const limit = Number(limitValue)

  if (!/^\d+$/.test(pageValue) || !Number.isSafeInteger(page) || page < 1) {
    return jsonWithPublicCache({ error: 'Page must be a positive integer.' }, { status: 400 })
  }
  if (!isNewsServer(server)) {
    return jsonWithPublicCache({ error: 'Unsupported news server.' }, { status: 400 })
  }
  if (!isNewsCategory(category, server)) {
    return jsonWithPublicCache({ error: 'Unsupported news category.' }, { status: 400 })
  }
  if (!/^\d+$/.test(limitValue) || !Number.isSafeInteger(limit) || limit < 1 || limit > 12) {
    return jsonWithPublicCache({ error: 'Limit must be an integer from 1 to 12.' }, { status: 400 })
  }

  try {
    if (server === 'global-x' || server === 'jp-x') {
      const response = newsResponse(await getStoredXNews(server, page, limit))
      response.headers.set('Cache-Control', X_NEWS_CACHE_CONTROL)
      return response
    }
    return newsResponse(server === 'jp'
      ? await getOfficialJpNews(page, category, limit)
      : await getOfficialNews(page, category, limit))
  } catch (error) {
    if (error instanceof NewsUpstreamError) {
      return jsonWithPublicCache({ error: error.message }, { status: 502 })
    }
    return jsonWithPublicCache({ error: 'Official news is temporarily unavailable.' }, { status: 502 })
  }
}
