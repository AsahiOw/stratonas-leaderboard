import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import type { NewsLinkPreview, NewsMedia, NewsPageResult, NewsPost, NewsServer, OfficialNewsArticle, QuotedNewsPost } from '@/lib/blue-archive-news'

const SYNDICATION_ORIGIN = 'https://syndication.twitter.com'
const REQUEST_TIMEOUT_MS = 12_000
const INITIAL_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000

export const X_ACCOUNTS = {
  'global-x': { handle: 'EN_BlueArchive', name: 'Blue Archive' },
  'jp-x': { handle: 'Blue_ArchiveJP', name: 'ブルーアーカイブ' },
} as const

export type XNewsServer = keyof typeof X_ACCOUNTS

type CollectedPost = {
  postId: string
  account: string
  text: string
  url: string
  publishedAt: string
  media: NewsMedia[]
  quotedPost: QuotedNewsPost | null
  linkPreview: NewsLinkPreview | null
}

function decodeEntities(value: string): string {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const hex = entity[1]?.toLowerCase() === 'x'
      const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    return named[entity.toLowerCase()] ?? match
  })
}

function safeXUrl(value: unknown, handle?: string): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value, 'https://x.com')
    if (url.protocol !== 'https:' || !['x.com', 'twitter.com'].includes(url.hostname)) return null
    if (handle && !url.pathname.toLowerCase().startsWith(`/${handle.toLowerCase()}/status/`)) return null
    url.hostname = 'x.com'
    return url.toString()
  } catch { return null }
}

function safeMediaUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'pbs.twimg.com' ? url.toString() : null
  } catch { return null }
}

function safeVideoUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'video.twimg.com' && url.pathname.endsWith('.mp4') ? url.toString() : null
  } catch { return null }
}

function safePreviewUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    const host = url.hostname.toLowerCase()
    if (host.includes('nitter') || ['xcancel.com', 'lightbrd.com', 'twiiit.com'].includes(host)) return null
    if (host === 'piped.video') return new URL(url.pathname + url.search, 'https://youtube.com').toString()
    return url.toString()
  } catch { return null }
}

function normalizeSyndicationCard(value: unknown): NewsLinkPreview | null {
  if (!value || typeof value !== 'object') return null
  const bindingValues = (value as { binding_values?: unknown }).binding_values
  if (!bindingValues || typeof bindingValues !== 'object') return null
  const unifiedValue = (bindingValues as { unified_card?: { string_value?: unknown } }).unified_card?.string_value
  if (typeof unifiedValue !== 'string') return null
  try {
    const card = JSON.parse(unifiedValue) as {
      component_objects?: Record<string, { type?: unknown; data?: Record<string, unknown> }>
      destination_objects?: Record<string, { data?: { url_data?: { url?: unknown } } }>
      media_entities?: Record<string, Record<string, unknown>>
    }
    const details = Object.values(card.component_objects || {}).find((item) => item.type === 'details')?.data
    const mediaData = Object.values(card.component_objects || {}).find((item) => item.type === 'media')?.data
    const destinationKey = typeof details?.destination === 'string' ? details.destination : ''
    const url = safePreviewUrl(card.destination_objects?.[destinationKey]?.data?.url_data?.url)
    const title = ((details?.title as { content?: unknown } | undefined)?.content)
    const subtitle = ((details?.subtitle as { content?: unknown } | undefined)?.content)
    const mediaId = typeof mediaData?.id === 'string' ? mediaData.id : ''
    const imageUrl = safeMediaUrl(card.media_entities?.[mediaId]?.media_url_https)
    if (!url || typeof title !== 'string' || !title.trim()) return null
    return { title: decodeEntities(title).trim(), subtitle: typeof subtitle === 'string' ? decodeEntities(subtitle).trim() : new URL(url).hostname, url, imageUrl }
  } catch { return null }
}

function normalizeMedia(value: unknown): NewsMedia[] {
  if (!Array.isArray(value)) return []
  const result: NewsMedia[] = []
  value.slice(0, 4).forEach((item) => {
    if (!item || typeof item !== 'object') return
    const row = item as Record<string, unknown>
    const url = safeMediaUrl(row.media_url_https)
    if (!url) return
    const type = row.type === 'video' || row.type === 'animated_gif' ? 'video' : 'photo'
    const variants = ((row.video_info as { variants?: unknown } | undefined)?.variants)
    const videoUrl = type === 'video' && Array.isArray(variants)
      ? variants
        .filter((variant): variant is Record<string, unknown> => Boolean(variant) && typeof variant === 'object' && (variant as Record<string, unknown>).content_type === 'video/mp4')
        .sort((left, right) => Number(right.bitrate || 0) - Number(left.bitrate || 0))
        .map((variant) => safeVideoUrl(variant.url))
        .find((value): value is string => Boolean(value))
      : null
    result.push({ url, type, ...(safeXUrl(row.expanded_url) ? { targetUrl: safeXUrl(row.expanded_url)! } : {}), ...(videoUrl ? { videoUrl } : {}) })
  })
  return result
}

function normalizeSyndicationTweet(value: unknown, handle: string): CollectedPost | null {
  if (!value || typeof value !== 'object') return null
  const tweet = value as Record<string, unknown>
  if (tweet.in_reply_to_status_id_str || tweet.retweeted_status) return null
  const postId = typeof tweet.id_str === 'string' ? tweet.id_str : ''
  const text = typeof tweet.full_text === 'string' ? decodeEntities(tweet.full_text).trim() : ''
  const url = safeXUrl(tweet.permalink, handle)
  const publishedAt = typeof tweet.created_at === 'string' ? new Date(tweet.created_at.replace(/([+-]\d{2})(\d{2}) /, '$1:$2 ')) : new Date(NaN)
  if (!/^\d{1,20}$/.test(postId) || !text || !url || Number.isNaN(publishedAt.getTime())) return null
  const quoted = tweet.quoted_status && typeof tweet.quoted_status === 'object'
    ? normalizeSyndicationQuote(tweet.quoted_status as Record<string, unknown>)
    : null
  return { postId, account: handle, text, url, publishedAt: publishedAt.toISOString(), media: normalizeMedia((tweet.extended_entities as Record<string, unknown> | undefined)?.media), quotedPost: quoted, linkPreview: normalizeSyndicationCard(tweet.card) }
}

function normalizeSyndicationQuote(tweet: Record<string, unknown>): QuotedNewsPost | null {
  const text = typeof tweet.full_text === 'string' ? decodeEntities(tweet.full_text).trim() : ''
  const url = safeXUrl(tweet.permalink)
  const user = tweet.user && typeof tweet.user === 'object' ? tweet.user as Record<string, unknown> : null
  if (!text || !url) return null
  return { text, url, authorName: typeof user?.name === 'string' ? user.name : 'X', media: normalizeMedia((tweet.extended_entities as Record<string, unknown> | undefined)?.media) }
}

export function parseSyndicationTimeline(html: string, handle: string): CollectedPost[] {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!match) return []
  try {
    const raw = JSON.parse(match[1]) as { props?: { pageProps?: { timeline?: { entries?: unknown[] } } } }
    const entries = raw.props?.pageProps?.timeline?.entries
    if (!Array.isArray(entries)) return []
    return entries.map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const row = entry as { type?: unknown; content?: { tweet?: unknown } }
      return row.type === 'tweet' ? normalizeSyndicationTweet(row.content?.tweet, handle) : null
    }).filter((post): post is CollectedPost => Boolean(post))
  } catch { return [] }
}

function xmlText(value: string): string {
  return decodeEntities(value.replace(/^<!\[CDATA\[|\]\]>$/g, '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, '')).trim()
}

function nitterMediaFromHtml(html: string): NewsMedia[] {
  const media: NewsMedia[] = []
  Array.from(html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)).forEach((match) => {
    let source = decodeEntities(match[1])
    let mediaPath = ''
    try {
      const url = new URL(source, 'https://nitter.invalid')
      const encodedPath = url.pathname.startsWith('/pic/') ? url.pathname.slice(5) : ''
      const decodedPath = decodeURIComponent(encodedPath)
      mediaPath = decodedPath.startsWith('pbs.twimg.com/') ? decodedPath.slice('pbs.twimg.com/'.length) : decodedPath
      if (!/^(?:media|tweet_video_thumb|ext_tw_video_thumb|amplify_video_thumb)\/[A-Za-z0-9_./-]+$/i.test(mediaPath)) return
      source = `https://pbs.twimg.com/${mediaPath}`
    } catch { return }
    const url = safeMediaUrl(source)
    if (!url || media.some((item) => item.url === url)) return
    const gifName = mediaPath.match(/^tweet_video_thumb\/([^/]+)\.[A-Za-z0-9]+$/i)?.[1]
    const videoUrl = gifName ? safeVideoUrl(`https://video.twimg.com/tweet_video/${gifName}.mp4`) : null
    media.push({ url, type: source.includes('video_thumb') ? 'video' : 'photo', ...(videoUrl ? { videoUrl } : {}) })
  })
  return media.slice(0, 4)
}

function normalizeNitterCard(html: string): NewsLinkPreview | null {
  const configuredNitterHosts = new Set(nitterOrigins().map((origin) => new URL(origin).hostname))
  const destination = Array.from(html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi))
    .map((match) => safePreviewUrl(decodeEntities(match[1])))
    .filter((url): url is string => {
      if (!url) return false
      const parsed = new URL(url)
      return !configuredNitterHosts.has(parsed.hostname) && !['x.com', 'twitter.com'].includes(parsed.hostname)
    })
    .at(-1)
  if (!destination) return null
  const lines = xmlText(html).split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const domainIndex = lines.findIndex((line) => /^(?:www\.)?(?:youtube\.com|youtu\.be)$/i.test(line))
  const linkIndex = lines.findIndex((line) => /^Link$/i.test(line))
  const title = domainIndex > 0 ? lines[domainIndex - 1] : linkIndex >= 0 && lines[linkIndex + 1] ? lines[linkIndex + 1] : new URL(destination).hostname
  const imageUrl = nitterMediaFromHtml(html).at(-1)?.url || null
  return { title, subtitle: new URL(destination).hostname.replace(/^www\./, ''), url: destination, imageUrl }
}

export function parseNitterRss(xml: string, handle: string): CollectedPost[] {
  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)).map<CollectedPost | null>((match) => {
    const item = match[1]
    const link = xmlText(item.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '')
    const url = safeXUrl(link.replace(/^https:\/\/[^/]+/i, 'https://x.com'), handle)
    const postId = url?.match(/\/status\/(\d+)/)?.[1] || ''
    const title = xmlText(item.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '')
    const descriptionHtml = item.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || ''
    const quoteHtml = descriptionHtml.match(/<blockquote>([\s\S]*?)<\/blockquote>/i)?.[1] || ''
    const mainHtml = descriptionHtml.replace(/<hr\s*\/?\s*>\s*<blockquote>[\s\S]*?<\/blockquote>/i, '')
    const description = xmlText(mainHtml)
    const publishedAt = new Date(xmlText(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || ''))
    if (!url || !postId || !title || Number.isNaN(publishedAt.getTime()) || /^(?:R to @|RT by @)/i.test(title)) return null
    const linkPreview = normalizeNitterCard(mainHtml)
    const rawText = description || title
    const cardMarker = linkPreview ? rawText.split(/\r?\n/).findIndex((line) => /^Link$/i.test(line.trim())) : -1
    const text = cardMarker >= 0 ? rawText.split(/\r?\n/).slice(0, cardMarker).join('\n').trim() : rawText
    const media = nitterMediaFromHtml(mainHtml).filter((item) => item.url !== linkPreview?.imageUrl)
    const quoteUrlValue = quoteHtml.match(/<cite>[\s\S]*?<a\b[^>]*href=["']([^"']+)["']/i)?.[1] || ''
    const quoteUrl = safeXUrl(quoteUrlValue.replace(/^https:\/\/[^/]+/i, 'https://x.com'))
    const quoteAuthor = xmlText(quoteHtml.match(/<b>([\s\S]*?)<\/b>/i)?.[1] || '') || 'X'
    const quoteBody = xmlText(quoteHtml.replace(/<footer>[\s\S]*?<\/footer>/i, '').replace(/<b>[\s\S]*?<\/b>/i, ''))
    const quotedPost = quoteHtml && quoteUrl && quoteBody ? { text: quoteBody, url: quoteUrl, authorName: quoteAuthor, media: nitterMediaFromHtml(quoteHtml) } : null
    return { postId, account: handle, text, url, publishedAt: publishedAt.toISOString(), media, quotedPost, linkPreview }
  }).filter((post): post is CollectedPost => Boolean(post))
}

async function fetchSyndication(handle: string): Promise<CollectedPost[]> {
  const response = await fetch(`${SYNDICATION_ORIGIN}/srv/timeline-profile/screen-name/${handle}`, { headers: { 'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' }, cache: 'no-store', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  if (!response.ok) throw new Error('syndication unavailable')
  return parseSyndicationTimeline(await response.text(), handle)
}

function nitterOrigins(): string[] {
  return (process.env.NITTER_BASE_URLS || '').split(',').map((value) => value.trim().replace(/\/+$/, '')).filter((value) => {
    try { return new URL(value).protocol === 'https:' } catch { return false }
  })
}

async function fetchNitter(origin: string, handle: string): Promise<CollectedPost[]> {
  const response = await fetch(`${origin}/${handle}/rss`, { headers: { Accept: 'application/rss+xml' }, cache: 'no-store', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  if (!response.ok) throw new Error('nitter unavailable')
  const xml = await response.text()
  if (!/<rss[\s>]/i.test(xml)) throw new Error('nitter returned a non-RSS response')
  return parseNitterRss(xml, handle)
}

export function syndicationToken(postId: string): string {
  return ((Number(postId) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '')
}

type SinglePostAssets = { media: NewsMedia[]; linkPreview: NewsLinkPreview | null }

async function fetchSinglePostAssets(postId: string, handle: string): Promise<SinglePostAssets> {
  const url = new URL('/tweet-result', 'https://cdn.syndication.twimg.com')
  url.searchParams.set('id', postId)
  url.searchParams.set('lang', handle === 'Blue_ArchiveJP' ? 'ja' : 'en')
  url.searchParams.set('token', syndicationToken(postId))
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  if (!response.ok) return { media: [], linkPreview: null }
  const raw = await response.json() as { id_str?: unknown; user?: { screen_name?: unknown }; mediaDetails?: unknown; card?: unknown }
  if (raw.id_str !== postId || raw.user?.screen_name !== handle) return { media: [], linkPreview: null }
  return { media: normalizeMedia(raw.mediaDetails), linkPreview: normalizeSyndicationCard(raw.card) }
}

export async function collectXAccount(handle: string): Promise<CollectedPost[]> {
  const results = await Promise.allSettled([fetchSyndication(handle), ...nitterOrigins().map((origin) => fetchNitter(origin, handle))])
  const merged = new Map<string, CollectedPost>()
  results.forEach((result) => { if (result.status === 'fulfilled') result.value.forEach((post) => {
    const previous = merged.get(post.postId)
    merged.set(post.postId, { ...previous, ...post, media: post.media.length ? post.media : previous?.media || [], quotedPost: post.quotedPost || previous?.quotedPost || null, linkPreview: post.linkPreview || previous?.linkPreview || null })
  }) })
  if (!results.some((result) => result.status === 'fulfilled')) throw new Error('all X sources unavailable')
  const missingMedia = Array.from(merged.values()).filter((post) =>
    (post.media.length === 0 && /(?:^|[【\[])GIF(?:[】\]]|$)/i.test(post.text)) ||
    post.media.some((item) => item.type === 'video' && !item.videoUrl)
  )
  const enrichments = await Promise.allSettled(missingMedia.map(async (post) => ({ post, assets: await fetchSinglePostAssets(post.postId, handle) })))
  enrichments.forEach((result) => {
    if (result.status === 'fulfilled' && result.value.assets.media.length > 0) {
      merged.set(result.value.post.postId, { ...result.value.post, media: result.value.assets.media })
    }
  })
  return Array.from(merged.values()).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
}

let syncPromise: Promise<void> | null = null

export function syncXNews(): Promise<void> {
  if (syncPromise) return syncPromise
  syncPromise = Promise.all(Object.values(X_ACCOUNTS).map(async ({ handle }) => {
    await prisma.xNewsSyncState.upsert({ where: { account: handle }, create: { account: handle, lastAttemptAt: new Date() }, update: { lastAttemptAt: new Date() } })
    try {
      const posts = await collectXAccount(handle)
      const existing = await prisma.xNewsPost.count({ where: { account: handle } })
      const cutoff = Date.now() - INITIAL_LOOKBACK_MS
      const selected = existing === 0 ? posts.filter((post) => Date.parse(post.publishedAt) >= cutoff).slice(0, 100) : posts
      const existingRows = await prisma.xNewsPost.findMany({
        where: { account: handle, postId: { in: selected.map((post) => post.postId) } },
        select: { postId: true, linkPreview: true, media: true },
      })
      const existingPreviews = new Map(existingRows.map((row) => [row.postId, asLinkPreview(row.linkPreview)]))
      const existingMedia = new Map(existingRows.map((row) => [row.postId, asMedia(row.media)]))
      await prisma.$transaction(selected.map((post) => {
        const previousMedia = new Map((existingMedia.get(post.postId) || []).map((item) => [item.url, item]))
        const mergedMedia = post.media.map((item) => ({ ...previousMedia.get(item.url), ...item }))
        return prisma.xNewsPost.upsert({
        where: { account_postId: { account: handle, postId: post.postId } },
        create: { ...post, publishedAt: new Date(post.publishedAt), media: post.media as unknown as Prisma.InputJsonValue, quotedPost: post.quotedPost as unknown as Prisma.InputJsonValue, linkPreview: post.linkPreview as unknown as Prisma.InputJsonValue },
        update: { text: post.text, url: post.url, publishedAt: new Date(post.publishedAt), ...(mergedMedia.length || post.linkPreview?.imageUrl ? { media: mergedMedia as unknown as Prisma.InputJsonValue } : {}), ...(post.quotedPost ? { quotedPost: post.quotedPost as unknown as Prisma.InputJsonValue } : {}), ...(post.linkPreview && (post.linkPreview.imageUrl || !existingPreviews.get(post.postId)) ? { linkPreview: post.linkPreview as unknown as Prisma.InputJsonValue } : {}) },
      })}))
      await enrichStoredMissingMedia(handle)
      await prisma.xNewsSyncState.update({ where: { account: handle }, data: { lastSuccessAt: new Date(), lastPostId: posts[0]?.postId, error: null } })
      console.info(`X news sync ${handle}: stored ${selected.length} posts`)
    } catch (error) {
      await prisma.xNewsSyncState.update({ where: { account: handle }, data: { error: error instanceof Error ? error.message.slice(0, 160) : 'sync failed' } })
      console.warn(`X news sync ${handle} failed`)
    }
  })).then(() => undefined).finally(() => { syncPromise = null })
  return syncPromise
}

function asMedia(value: Prisma.JsonValue): NewsMedia[] { return Array.isArray(value) ? value as unknown as NewsMedia[] : [] }
function asQuote(value: Prisma.JsonValue | null): QuotedNewsPost | null { return value && typeof value === 'object' && !Array.isArray(value) ? value as unknown as QuotedNewsPost : null }
function asLinkPreview(value: Prisma.JsonValue | null): NewsLinkPreview | null { return value && typeof value === 'object' && !Array.isArray(value) ? value as unknown as NewsLinkPreview : null }

async function enrichStoredMissingMedia(handle: string) {
  const rows = await prisma.xNewsPost.findMany({
    where: { account: handle },
    orderBy: { publishedAt: 'desc' },
    take: 100,
    select: { postId: true, text: true, media: true, linkPreview: true },
  })
  const candidates = rows.filter((row) => {
    const media = asMedia(row.media)
    return (media.length === 0 && /(?:^|[【\[])GIF(?:[】\]]|$)/i.test(row.text)) || media.some((item) => item.type === 'video' && !item.videoUrl)
  })
  const missingPreviews = rows.filter((row) => {
    const preview = asLinkPreview(row.linkPreview)
    return preview && !preview.imageUrl
  })
  const assetsByPost = await Promise.allSettled(Array.from(new Map([...candidates, ...missingPreviews].map((row) => [row.postId, row])).values())
    .map(async (row) => ({ row, assets: await fetchSinglePostAssets(row.postId, handle) })))
  await prisma.$transaction(assetsByPost.flatMap((result) => {
    if (result.status !== 'fulfilled') return []
    const data: Prisma.XNewsPostUpdateInput = {}
    if (result.value.assets.media.length > 0) data.media = result.value.assets.media as unknown as Prisma.InputJsonValue
    if (result.value.assets.linkPreview) data.linkPreview = result.value.assets.linkPreview as unknown as Prisma.InputJsonValue
    return Object.keys(data).length
      ? [prisma.xNewsPost.update({ where: { account_postId: { account: handle, postId: result.value.row.postId } }, data })]
      : []
  }))
}

export async function getStoredXNews(server: XNewsServer, page: number, limit: number): Promise<NewsPageResult> {
  const account = X_ACCOUNTS[server]
  const [rows, total] = await Promise.all([
    prisma.xNewsPost.findMany({ where: { account: account.handle }, orderBy: [{ publishedAt: 'desc' }, { postId: 'desc' }], skip: (page - 1) * limit, take: limit }),
    prisma.xNewsPost.count({ where: { account: account.handle } }),
  ])
  const posts: NewsPost[] = rows.map((row) => {
    const linkPreview = asLinkPreview(row.linkPreview)
    const media = asMedia(row.media).filter((item) => item.url !== linkPreview?.imageUrl)
    const firstLine = row.text.split(/\r?\n/).find(Boolean) || 'Official X post'
    return { server, id: row.postId, title: firstLine.slice(0, 180), category: 'X', publishedAt: row.publishedAt.toISOString(), url: row.url, thumbnailUrl: media[0]?.url || null, mediaUrls: media.map((item) => item.url), summary: row.text, authorName: account.name, authorAvatarUrl: null, source: 'x', media, quotedPost: asQuote(row.quotedPost), linkPreview }
  })
  return { server, posts, page, hasMore: page * limit < total, categories: [] }
}

function escapeHtml(value: string): string { return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }
function textHtml(value: string): string { return value.split(/\r?\n/).map((line) => line ? `<p>${escapeHtml(line)}</p>` : '<br>').join('') }
function mediaHtml(media: NewsMedia[]): string { return media.map((item) => item.type === 'video' && item.videoUrl
  ? `<video src="/api/x-video-proxy?url=${encodeURIComponent(item.videoUrl)}" poster="/api/image-proxy?url=${encodeURIComponent(item.url)}&cache=news" autoplay muted loop playsinline controls></video>`
  : `<img src="/api/image-proxy?url=${encodeURIComponent(item.url)}&cache=news" alt="" loading="lazy">`).join('') }
function previewHtml(preview: NewsLinkPreview | null): string { return preview ? `<a href="${escapeHtml(preview.url)}" target="_blank" rel="noopener noreferrer">${preview.imageUrl ? `<img src="/api/image-proxy?url=${encodeURIComponent(preview.imageUrl)}&cache=news" alt="" loading="lazy">` : ''}<strong>${escapeHtml(preview.title)}</strong><br>${escapeHtml(preview.subtitle)}</a>` : '' }

export async function getStoredXNewsArticle(postId: string, server: NewsServer): Promise<OfficialNewsArticle> {
  if (server !== 'global-x' && server !== 'jp-x') throw new Error('Invalid X news server')
  const account = X_ACCOUNTS[server]
  const row = await prisma.xNewsPost.findUnique({ where: { account_postId: { account: account.handle, postId } } })
  if (!row) throw new Error('X post not found')
  const preview = asLinkPreview(row.linkPreview)
  const media = asMedia(row.media).filter((item) => item.url !== preview?.imageUrl)
  const quote = asQuote(row.quotedPost)
  const title = row.text.split(/\r?\n/).find(Boolean)?.slice(0, 180) || 'Official X post'
  const quoteHtml = quote ? `<blockquote><strong>${escapeHtml(quote.authorName)}</strong>${textHtml(quote.text)}${mediaHtml(quote.media)}</blockquote>` : ''
  return { id: postId, title, content: `${row.text}${preview ? `\n\n${preview.title}\n${preview.url}` : ''}${quote ? `\n\nQuoted post by ${quote.authorName}:\n${quote.text}` : ''}`, modifiedAt: row.updatedAt.toISOString(), mediaUrls: media.map((item) => item.url), contentHtml: `${textHtml(row.text)}${mediaHtml(media)}${previewHtml(preview)}${quoteHtml}` }
}
