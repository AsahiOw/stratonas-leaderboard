import sanitizeHtml from 'sanitize-html'

const NEXON_ORIGIN = 'https://forum.nexon.com'
const COMMUNITY_ID = '314'
const COMMUNITY_ALIAS = 'bluearchive-en'
const PAGE_SIZE = 12
const CACHE_SECONDS = 1800
const REQUEST_TIMEOUT_MS = 8000
const JP_API_ORIGIN = 'https://api-web.bluearchive.jp'
const JP_SITE_ORIGIN = 'https://bluearchive.jp'

const BOARD_CATEGORIES = [
  { id: '3028', name: 'Announcements' },
  { id: '3217', name: 'Updates' },
  { id: '3218', name: 'Events' },
  { id: '3223', name: 'Shop' },
  { id: '3219', name: 'Known Issues' },
  { id: '3220', name: 'Ban Notice' },
  { id: '3221', name: 'FAQ' },
  { id: '3222', name: 'Game Guides' },
  { id: '3224', name: 'Redeem Coupon' },
] as const

const CATEGORY_BY_BOARD = new Map<string, string>(BOARD_CATEGORIES.map((category) => [category.id, category.name]))
const BOARD_BY_CATEGORY = new Map<string, string>(BOARD_CATEGORIES.map((category) => [category.name, category.id]))
const INITIAL_BLOCK_START_KEY = '253402300799,9223372036854775807'

export const NEWS_CATEGORIES = BOARD_CATEGORIES.map((category) => category.name)
export const JP_NEWS_CATEGORIES = ['イベント', 'お知らせ', 'メンテナンス'] as const
export type NewsServer = 'global' | 'jp'

export type NewsPost = {
  server: NewsServer
  id: string
  title: string
  category: string
  publishedAt: string
  url: string
  thumbnailUrl: string | null
  mediaUrls: string[]
  summary: string | null
  authorName: string
  authorAvatarUrl: string | null
}

export type NewsPageResult = {
  server: NewsServer
  posts: NewsPost[]
  page: number
  hasMore: boolean
  categories: string[]
}

type NexonThread = {
  threadId?: unknown
  boardId?: unknown
  title?: unknown
  createDate?: unknown
  thumbnailImageUrl?: unknown
  release?: unknown
  isDelete?: unknown
  isWebHide?: unknown
}

type NexonThreadDetail = NexonThread & {
  content?: unknown
  summary?: unknown
  modifyDate?: unknown
  user?: { nickname?: unknown; profileImageUrl?: unknown }
}

type NexonThreadPage = {
  threads?: unknown
  totalPages?: unknown
}

export class NewsUpstreamError extends Error {
  constructor() {
    super('Official news is temporarily unavailable.')
    this.name = 'NewsUpstreamError'
  }
}

export function isNewsServer(server: string): server is NewsServer {
  return server === 'global' || server === 'jp'
}

export function isNewsCategory(category: string, server: NewsServer = 'global'): boolean {
  return category === 'all' || (server === 'jp' ? JP_NEWS_CATEGORIES.includes(category as typeof JP_NEWS_CATEGORIES[number]) : BOARD_BY_CATEGORY.has(category))
}

function safeThumbnailUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null

  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.hostname !== 'dszw1qtcnsa5e.cloudfront.net') return null
    return url.toString()
  } catch {
    return null
  }
}

function decodeText(value: unknown): string | null {
  return plainTextFromHtml(value, 280)
}

export function plainTextFromHtml(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const text = value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return null
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…` : text
}

export type OfficialNewsArticle = {
  id: string
  title: string
  content: string
  modifiedAt: string
  mediaUrls: string[]
  contentHtml: string
}

type JpNewsRow = {
  id?: unknown
  title?: unknown
  summary?: unknown
  content?: unknown
  typeId?: unknown
  publishTime?: unknown
}

type JpNewsList = {
  meta?: { ok?: unknown }
  data?: { rows?: unknown; count?: unknown }
}

const JP_CATEGORY_BY_ID = new Map<number, string>([[1, 'イベント'], [2, 'お知らせ'], [3, 'メンテナンス']])
const JP_ID_BY_CATEGORY = new Map<string, number>(Array.from(JP_CATEGORY_BY_ID, ([id, name]) => [name, id]))

function safeJpImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'webusstatic.yo-star.com' ? url.toString() : null
  } catch {
    return null
  }
}

function jpImagesFromContent(content: unknown): string[] {
  if (typeof content !== 'string') return []
  return Array.from(new Set(Array.from(content.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi))
    .map((match) => safeJpImageUrl(match[1]))
    .filter((url): url is string => Boolean(url))))
}

export function sanitizeOfficialArticleHtml(value: unknown, server: NewsServer): string {
  if (typeof value !== 'string') return ''
  return sanitizeHtml(value, {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'a', 'img'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'loading'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['https'],
    transformTags: {
      a: (_tagName, attributes) => ({
        tagName: 'a',
        attribs: { href: attributes.href || '', target: '_blank', rel: 'noopener noreferrer' },
      }),
      img: (_tagName, attributes) => {
        const source = server === 'jp' ? safeJpImageUrl(attributes.src) : safeThumbnailUrl(attributes.src)
        if (!source) return { tagName: 'span', attribs: {} as Record<string, string> }
        return {
          tagName: 'img',
          attribs: {
            src: `/api/image-proxy?url=${encodeURIComponent(source)}`,
            alt: attributes.alt || '',
            loading: 'lazy',
          },
        }
      },
    },
  })
}

function normalizeJpRow(value: unknown): NewsPost | null {
  if (!value || typeof value !== 'object') return null
  const row = value as JpNewsRow
  const id = String(row.id || '')
  const category = JP_CATEGORY_BY_ID.get(Number(row.typeId))
  const title = typeof row.summary === 'string' ? row.summary.trim() : ''
  const publishedAt = Number(row.publishTime)
  if (!/^\d{1,20}$/.test(id) || !category || !title || !Number.isFinite(publishedAt) || publishedAt <= 0) return null
  const mediaUrls = jpImagesFromContent(row.content)
  return {
    server: 'jp',
    id,
    title,
    category,
    publishedAt: new Date(publishedAt).toISOString(),
    url: `${JP_SITE_ORIGIN}/news/newsJump/${id}`,
    thumbnailUrl: mediaUrls[0] || null,
    mediaUrls,
    summary: plainTextFromHtml(row.content, 280),
    authorName: 'ブルーアーカイブ',
    authorAvatarUrl: null,
  }
}

export function normalizeJpNewsPage(raw: unknown, page: number, pageSize: number): NewsPageResult {
  if (!raw || typeof raw !== 'object') throw new NewsUpstreamError()
  const response = raw as JpNewsList
  if (response.meta?.ok !== true || !Array.isArray(response.data?.rows)) throw new NewsUpstreamError()
  const posts = response.data.rows.map(normalizeJpRow).filter((post): post is NewsPost => Boolean(post))
  const count = Number(response.data.count)
  return {
    server: 'jp',
    posts,
    page,
    hasMore: Number.isFinite(count) && page * pageSize < count,
    categories: [...JP_NEWS_CATEGORIES],
  }
}

async function fetchThreadDetail(threadId: string): Promise<NexonThreadDetail> {
  const url = new URL(`/api/v1/thread/${threadId}`, NEXON_ORIGIN)
  url.searchParams.set('alias', COMMUNITY_ALIAS)
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: CACHE_SECONDS },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) throw new NewsUpstreamError()
  return await response.json() as NexonThreadDetail
}

export async function getOfficialNewsArticle(threadId: string, server: NewsServer = 'global'): Promise<OfficialNewsArticle> {
  if (!/^\d{1,20}$/.test(threadId)) throw new NewsUpstreamError()
  if (server === 'jp') {
    try {
      const url = new URL('/api/news/detail', JP_API_ORIGIN)
      url.searchParams.set('id', threadId)
      type JpNewsDetail = { meta?: { ok?: unknown }; data?: { news?: JpNewsRow } }
      let raw: JpNewsDetail | null = null
      for (let attempt = 0; attempt < 2 && !raw; attempt += 1) {
        try {
          const response = await fetch(url, { headers: { Accept: 'application/json' }, next: { revalidate: CACHE_SECONDS }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
          if (response.ok) raw = await response.json() as JpNewsDetail
        } catch {
          // Retry one transient timeout or network failure.
        }
      }
      if (!raw) {
        try {
          const listUrl = new URL('/api/news/list', JP_API_ORIGIN)
          listUrl.searchParams.set('typeId', '0')
          listUrl.searchParams.set('pageNum', '100')
          listUrl.searchParams.set('pageIndex', '1')
          const response = await fetch(listUrl, { headers: { Accept: 'application/json' }, next: { revalidate: CACHE_SECONDS }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
          if (response.ok) {
            const list = await response.json() as JpNewsList
            const news = Array.isArray(list.data?.rows)
              ? list.data.rows.find((row) => String((row as JpNewsRow)?.id || '') === threadId) as JpNewsRow | undefined
              : undefined
            if (list.meta?.ok === true && news) raw = { meta: { ok: true }, data: { news } }
          }
        } catch {
          // The detail and independent list fallback are both unavailable.
        }
      }
      if (!raw) throw new NewsUpstreamError()
      const news = raw.data?.news
      const content = plainTextFromHtml(news?.content, 50000)
      const title = typeof news?.summary === 'string' ? news.summary.trim() : ''
      if (raw.meta?.ok !== true || String(news?.id || '') !== threadId || !title || !content) throw new NewsUpstreamError()
      const publishedAt = Number(news?.publishTime)
      return {
        id: threadId,
        title,
        content,
        modifiedAt: Number.isFinite(publishedAt) ? new Date(publishedAt).toISOString() : '',
        mediaUrls: jpImagesFromContent(news?.content),
        contentHtml: sanitizeOfficialArticleHtml(news?.content, 'jp'),
      }
    } catch (error) {
      if (error instanceof NewsUpstreamError) throw error
      throw new NewsUpstreamError()
    }
  }
  const detail = await fetchThreadDetail(threadId)
  if (detail.threadId !== threadId || typeof detail.title !== 'string') throw new NewsUpstreamError()
  const content = plainTextFromHtml(detail.content, 50000)
  if (!content) throw new NewsUpstreamError()
  const modifiedAt = Number(detail.modifyDate || detail.createDate)
  return {
    id: threadId,
    title: detail.title.trim(),
    content,
    modifiedAt: Number.isFinite(modifiedAt) ? new Date(modifiedAt * 1000).toISOString() : '',
    mediaUrls: nexonImagesFromContent(detail.content),
    contentHtml: sanitizeOfficialArticleHtml(detail.content, 'global'),
  }
}

function nexonImagesFromContent(content: unknown): string[] {
  if (typeof content !== 'string') return []
  const images = Array.from(content.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi))
    .map((match) => safeThumbnailUrl(match[1]))
    .filter((url): url is string => Boolean(url))
  return Array.from(new Set(images))
}

export function previewImagesFromContent(content: unknown): string[] {
  const uniqueImages = nexonImagesFromContent(content)
  if (uniqueImages.length === 0) return []
  return uniqueImages.length > 1 ? uniqueImages.slice(1) : uniqueImages
}

export function previewImageFromContent(content: unknown): string | null {
  return previewImagesFromContent(content)[0] || null
}

function normalizeThread(value: unknown): NewsPost | null {
  if (!value || typeof value !== 'object') return null
  const thread = value as NexonThread
  const id = typeof thread.threadId === 'string' ? thread.threadId : ''
  const boardId = typeof thread.boardId === 'string' ? thread.boardId : ''
  const title = typeof thread.title === 'string' ? thread.title.trim() : ''
  const createdAt = typeof thread.createDate === 'number' ? thread.createDate : Number(thread.createDate)
  const category = CATEGORY_BY_BOARD.get(boardId)

  if (!/^\d+$/.test(id) || !category || !title || !Number.isFinite(createdAt) || createdAt <= 0) return null
  if (thread.release !== undefined && thread.release !== 'ON') return null
  if (thread.isDelete === true || thread.isWebHide === true) return null

  const url = new URL(`/${COMMUNITY_ALIAS}/board_view`, NEXON_ORIGIN)
  url.searchParams.set('board', boardId)
  url.searchParams.set('thread', id)
  if (url.hostname !== 'forum.nexon.com') return null

  return {
    server: 'global',
    id,
    title,
    category,
    publishedAt: new Date(createdAt * 1000).toISOString(),
    url: url.toString(),
    thumbnailUrl: safeThumbnailUrl(thread.thumbnailImageUrl),
    mediaUrls: [],
    summary: null,
    authorName: 'GM-Arona',
    authorAvatarUrl: null,
  }
}

async function enrichPost(post: NewsPost): Promise<NewsPost> {
  try {
    const detail = await fetchThreadDetail(post.id)
    const mediaUrls = previewImagesFromContent(detail.content)
    return {
      ...post,
      thumbnailUrl: mediaUrls[0] || post.thumbnailUrl,
      mediaUrls,
      summary: decodeText(detail.summary),
      authorName: typeof detail.user?.nickname === 'string' && detail.user.nickname.trim()
        ? detail.user.nickname.trim()
        : post.authorName,
      authorAvatarUrl: safeThumbnailUrl(detail.user?.profileImageUrl),
    }
  } catch {
    return post
  }
}

export function normalizeNewsPage(raw: unknown, page: number): NewsPageResult {
  if (!raw || typeof raw !== 'object') throw new NewsUpstreamError()
  const data = raw as NexonThreadPage
  if (!Array.isArray(data.threads)) throw new NewsUpstreamError()

  const postsById = new Map<string, NewsPost>()
  data.threads.forEach((thread) => {
    const post = normalizeThread(thread)
    if (post && !postsById.has(post.id)) postsById.set(post.id, post)
  })

  const posts = Array.from(postsById.values()).sort((left, right) => {
    const dateDifference = Date.parse(right.publishedAt) - Date.parse(left.publishedAt)
    return dateDifference || Number(right.id) - Number(left.id)
  })
  const totalPages = Number(data.totalPages)

  return {
    server: 'global',
    posts,
    page,
    hasMore: Number.isFinite(totalPages) && page < totalPages,
    categories: [...NEWS_CATEGORIES],
  }
}

function upstreamUrl(page: number, category: string, pageSize: number): URL {
  const boardId = BOARD_BY_CATEGORY.get(category)
  const path = boardId
    ? `/api/v1/board/${boardId}/threads`
    : `/api/v1/community/${COMMUNITY_ID}/threads`
  const url = new URL(path, NEXON_ORIGIN)
  url.searchParams.set('alias', COMMUNITY_ALIAS)
  url.searchParams.set('paginationType', 'PAGING')
  url.searchParams.set('pageSize', String(pageSize))
  url.searchParams.set('pageNo', String(page))
  url.searchParams.set('blockSize', '5')
  url.searchParams.set('hideType', 'WEB')

  if (page > 1) {
    url.searchParams.set('blockStartNo', '1')
    url.searchParams.set('blockStartKey', INITIAL_BLOCK_START_KEY)
  }

  return url
}

export async function getOfficialNews(page: number, category: string, pageSize = PAGE_SIZE): Promise<NewsPageResult> {
  try {
    const response = await fetch(upstreamUrl(page, category, pageSize), {
      headers: { Accept: 'application/json' },
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) throw new NewsUpstreamError()
    const normalized = normalizeNewsPage(await response.json(), page)
    return {
      ...normalized,
      posts: await Promise.all(normalized.posts.map(enrichPost)),
    }
  } catch (error) {
    if (error instanceof NewsUpstreamError) throw error
    throw new NewsUpstreamError()
  }
}

export async function getOfficialJpNews(page: number, category: string, pageSize = PAGE_SIZE): Promise<NewsPageResult> {
  try {
    const url = new URL('/api/news/list', JP_API_ORIGIN)
    url.searchParams.set('typeId', String(JP_ID_BY_CATEGORY.get(category) || 0))
    url.searchParams.set('pageNum', String(pageSize))
    url.searchParams.set('pageIndex', String(page))
    const response = await fetch(url, { headers: { Accept: 'application/json' }, next: { revalidate: CACHE_SECONDS }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
    if (!response.ok) throw new NewsUpstreamError()
    return normalizeJpNewsPage(await response.json(), page, pageSize)
  } catch (error) {
    if (error instanceof NewsUpstreamError) throw error
    throw new NewsUpstreamError()
  }
}
