'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpRight, AtSign, BadgeCheck, Globe2, Languages, Newspaper, Play, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import type { NewsPageResult, NewsPost, NewsServer, OfficialNewsArticle } from '@/lib/blue-archive-news'
import { requestPlanaNewsSummary } from '@/lib/plana-events'

const NEWS_SESSION_CACHE_PREFIX = 'stratonas:news:v12:'
const NEWS_CLIENT_FRESH_MS = 5 * 60 * 1000

type CachedNewsPage = {
  data: NewsPageResult
  cachedAt: number
}

function sessionCacheKey(server: NewsServer, category: string, page: number): string {
  return `${NEWS_SESSION_CACHE_PREFIX}${server}:${category}:${page}`
}

function readSessionPage(server: NewsServer, category: string, page: number): CachedNewsPage | null {
  try {
    const raw = window.sessionStorage.getItem(sessionCacheKey(server, category, page))
    if (!raw) return null
    const cached = JSON.parse(raw) as CachedNewsPage
    if (!cached || typeof cached.cachedAt !== 'number' || !Array.isArray(cached.data?.posts)) return null
    if (server.endsWith('-x') && cached.data.posts.length === 0) return null
    return cached
  } catch {
    return null
  }
}

function writeSessionPage(server: NewsServer, category: string, page: number, cached: CachedNewsPage) {
  if (server.endsWith('-x') && cached.data.posts.length === 0) return
  try {
    window.sessionStorage.setItem(sessionCacheKey(server, category, page), JSON.stringify(cached))
  } catch {
    // Memory caching still works when session storage is unavailable or full.
  }
}

function imageSource(url: string | null): string | null {
  return url ? `/api/image-proxy?url=${encodeURIComponent(url)}&cache=news` : null
}

function videoSource(url: string): string {
  return `/api/x-video-proxy?url=${encodeURIComponent(url)}`
}

function formatPublishedAt(value: string): string {
  return new Intl.DateTimeFormat('en', {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  }).format(new Date(value))
}

function regionLabel(server: NewsServer): string {
  return server === 'global' || server === 'global-x' ? 'Blue Archive Global' : 'Blue Archive Japan'
}

function NewsSkeleton() {
  return (
    <div className="mx-auto max-w-[720px] space-y-4" aria-label="Loading official news">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 animate-pulse rounded-full bg-border2" />
            <div className="flex-1 space-y-2"><div className="h-3 w-32 animate-pulse rounded bg-border2" /><div className="h-3 w-20 animate-pulse rounded bg-border2" /></div>
          </div>
          <div className="space-y-2 px-4 pb-4"><div className="h-5 animate-pulse rounded bg-border2" /><div className="h-3 w-4/5 animate-pulse rounded bg-border2" /></div>
          <div className="aspect-[16/9] animate-pulse bg-card2" />
        </div>
      ))}
    </div>
  )
}

function OfficialAvatar({ post }: { post: NewsPost }) {
  const avatar = imageSource(post.authorAvatarUrl)
  return avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatar} alt="" className="h-11 w-11 rounded-full border border-border2 bg-white object-cover" />
  ) : (
    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-accent/30 bg-accent/15 text-accent"><Newspaper size={20} aria-hidden /></div>
  )
}

function PostMedia({ post, onOpen }: { post: NewsPost; onOpen: () => void }) {
  const sourceMedia = post.media?.length ? post.media : (post.mediaUrls.length > 0
    ? post.mediaUrls.map((url) => ({ url, type: 'photo' as const }))
    : post.thumbnailUrl ? [{ url: post.thumbnailUrl, type: 'photo' as const }] : [])
  if (sourceMedia.length === 0) return null

  const visibleMedia = sourceMedia.slice(0, 5)
  const extraCount = sourceMedia.length - visibleMedia.length
  const count = visibleMedia.length
  const gridClass = count === 1
    ? 'grid-cols-1'
    : count === 2
      ? 'grid-cols-2'
      : count === 5
        ? 'grid-cols-4 grid-rows-2'
        : 'grid-cols-2 grid-rows-2'

  return (
    <div className={`grid h-[300px] gap-0.5 overflow-hidden border-y border-border bg-bg sm:h-[430px] ${gridClass}`}>
      {visibleMedia.map((media, index) => {
        const largeFirst = count === 3 || count === 5
        const tileClass = largeFirst && index === 0
          ? count === 5 ? 'col-span-2 row-span-2' : 'row-span-2'
          : ''
        return (
          media.type === 'video' && media.videoUrl ? (
            <div key={media.url} className={`relative min-h-0 overflow-hidden bg-black ${tileClass}`}>
              <video src={videoSource(media.videoUrl)} poster={imageSource(media.url) || undefined} autoPlay muted loop playsInline controls preload="metadata" className="h-full w-full object-cover" aria-label={`Looping video for ${post.title}`} />
            </div>
          ) : (
          <button
            type="button"
            key={media.url}
            onClick={() => media.type === 'video' && media.targetUrl ? window.open(media.targetUrl, '_blank', 'noopener,noreferrer') : onOpen()}
            className={`group relative min-h-0 overflow-hidden bg-black/20 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${tileClass}`}
            aria-label={`Open full post for ${post.title}, image ${index + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageSource(media.url) || undefined} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
            {media.type === 'video' && <span className="absolute inset-0 flex items-center justify-center"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/65 text-white"><Play size={22} className="ml-0.5 fill-current" /></span></span>}
            {index === visibleMedia.length - 1 && extraCount > 0 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-3xl font-bold text-white backdrop-blur-[1px] sm:text-4xl">
                +{extraCount}
              </span>
            )}
          </button>
          )
        )
      })}
    </div>
  )
}

function LinkPreview({ post }: { post: NewsPost }) {
  const preview = post.linkPreview
  if (!preview) return null
  return (
    <a href={preview.url} target="_blank" rel="noopener noreferrer" className="mt-3 block overflow-hidden rounded-xl border border-border bg-bg/60 transition-colors hover:border-accent/50">
      {preview.imageUrl && <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageSource(preview.imageUrl) || undefined} alt="" className="aspect-[1.91/1] w-full border-b border-border object-cover" />
      </>}
      <span className="block px-3 py-2.5"><span className="block text-sm font-semibold text-text">{preview.title}</span><span className="mt-0.5 block text-xs text-muted2">{preview.subtitle}</span></span>
    </a>
  )
}

function NewsPostModal({
  post,
  article,
  loading,
  error,
  onClose,
  onRetry,
  translatedHtml,
  translatedTitle,
  translating,
  translationProgress,
  translationError,
  showingTranslation,
  onTranslate,
  onToggleTranslation,
}: {
  post: NewsPost
  article: OfficialNewsArticle | null
  loading: boolean
  error: string | null
  onClose: () => void
  onRetry: () => void
  translatedHtml: string | null
  translatedTitle: string | null
  translating: boolean
  translationProgress: number | null
  translationError: string | null
  showingTranslation: boolean
  onTranslate: () => void
  onToggleTranslation: () => void
}) {
  const mediaUrls = article?.mediaUrls.length ? article.mediaUrls : post.mediaUrls

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm sm:p-5" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="news-post-modal-title" className="flex max-h-[calc(100vh-1rem)] w-full max-w-[920px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_28px_90px_rgba(0,0,0,0.55)] sm:max-h-[calc(100vh-2.5rem)]" onClick={(event) => event.stopPropagation()}>
        <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
          <OfficialAvatar post={post} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-sm font-bold"><span>{post.authorName}</span><BadgeCheck size={16} className="fill-accent text-bg" aria-label="Official account" /></div>
            <div className="mt-0.5 text-xs text-muted2">{regionLabel(post.server)} · {post.source === 'x' ? 'X · ' : ''}{formatPublishedAt(post.publishedAt)}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close full post" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card2 text-muted2 transition-colors hover:bg-border hover:text-text focus:outline-none focus:ring-2 focus:ring-accent/50">
            <X size={21} aria-hidden />
          </button>
        </header>

        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="px-4 py-5 sm:px-6">
            <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-accent">{post.category}</span>
            {post.source === 'x'
              ? <h2 id="news-post-modal-title" className="sr-only">Official X post by {post.authorName}</h2>
              : <h2 id="news-post-modal-title" className="mt-3 text-xl font-bold leading-snug text-text sm:text-2xl">{showingTranslation && translatedTitle ? translatedTitle : post.title}</h2>}
          </div>

          {loading ? (
            <div className="space-y-3 px-4 pb-8 sm:px-6" aria-label="Loading full post">
              <div className="h-4 animate-pulse rounded bg-border2" /><div className="h-4 animate-pulse rounded bg-border2" /><div className="h-4 w-4/5 animate-pulse rounded bg-border2" /><div className="mt-5 aspect-video animate-pulse rounded-xl bg-card2" />
            </div>
          ) : error ? (
            <div className="mx-4 mb-6 rounded-xl border border-red/25 bg-red/10 px-5 py-8 text-center sm:mx-6">
              <div className="font-semibold text-text">The full post could not be loaded.</div>
              <p className="mt-2 text-sm text-muted2">{error}</p>
              <button type="button" onClick={onRetry} className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-bold text-white">Try again</button>
            </div>
          ) : article && (
            (showingTranslation ? translatedHtml : article.contentHtml) ? (
              <>
                {showingTranslation && <div className="mx-4 mb-4 rounded-xl border border-accent/20 bg-accent/10 px-3 py-2 text-xs text-muted2 sm:mx-6">AI translation · Check the official Japanese post for exact wording.</div>}
                <div className="official-news-content px-4 pb-7 sm:px-6" dangerouslySetInnerHTML={{ __html: showingTranslation ? translatedHtml || '' : article.contentHtml }} />
              </>
            ) : (
              <>
                <div className="whitespace-pre-wrap px-4 pb-6 text-[15px] leading-7 text-muted2 sm:px-6 sm:text-base">{article.content}</div>
                {mediaUrls.length > 0 && (
                  <div className="space-y-2 border-t border-border bg-bg p-2 sm:p-4">
                    {mediaUrls.map((url, index) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={`${url}:${index}`} src={imageSource(url) || undefined} alt={`Official post image ${index + 1}`} className="mx-auto max-h-[780px] w-auto max-w-full rounded-xl bg-black/15 object-contain" />
                    ))}
                  </div>
                )}
              </>
            )
          )}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => requestPlanaNewsSummary({ threadId: post.id, title: post.title, server: post.server })} className="inline-flex items-center gap-1.5 rounded-full bg-[#fc96ab]/10 px-3 py-2 text-xs font-bold text-[#fc96ab] transition-colors hover:bg-[#fc96ab] hover:text-white">
              <Sparkles size={14} aria-hidden /> Summarize with Plana
            </button>
            {(post.server === 'jp' || post.server === 'jp-x') && article && (
              <button type="button" disabled={translating} onClick={translatedHtml ? onToggleTranslation : onTranslate} className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-2 text-xs font-bold text-accent transition-colors hover:bg-accent hover:text-white disabled:cursor-wait disabled:opacity-60">
                <Languages size={14} className={translating ? 'animate-pulse' : ''} aria-hidden /> {translating ? `Translating…${translationProgress ? ` ${translationProgress}%` : ''}` : showingTranslation ? 'View original' : 'Translate to English'}
              </button>
            )}
            {translationError && <button type="button" onClick={onTranslate} className="text-xs font-bold text-red hover:underline">Translation failed · Retry</button>}
          </div>
          <a href={post.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-2 text-xs font-bold text-accent transition-colors hover:bg-accent hover:text-white">{post.source === 'x' ? 'Open on X' : 'Official post'} <ArrowUpRight size={14} aria-hidden /></a>
        </footer>
      </div>
    </div>
  )
}

export function NewsPage() {
  const [server, setServer] = useState<NewsServer>('global')
  const [posts, setPosts] = useState<NewsPost[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [category, setCategory] = useState('all')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const pageCacheRef = useRef(new Map<string, CachedNewsPage>())
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const autoLoadPendingRef = useRef(false)
  const articleCacheRef = useRef(new Map<string, OfficialNewsArticle>())
  const translationCacheRef = useRef(new Map<string, { title: string; contentHtml: string }>())
  const articleRequestRef = useRef(0)
  const [selectedPost, setSelectedPost] = useState<NewsPost | null>(null)
  const [article, setArticle] = useState<OfficialNewsArticle | null>(null)
  const [articleLoading, setArticleLoading] = useState(false)
  const [articleError, setArticleError] = useState<string | null>(null)
  const [translatedHtml, setTranslatedHtml] = useState<string | null>(null)
  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null)
  const [translating, setTranslating] = useState(false)
  const [translationProgress, setTranslationProgress] = useState<number | null>(null)
  const [translationError, setTranslationError] = useState<string | null>(null)
  const [showingTranslation, setShowingTranslation] = useState(false)

  const loadArticle = useCallback(async (post: NewsPost) => {
    const key = `${post.server}:${post.id}`
    const cached = articleCacheRef.current.get(key)
    if (cached) {
      setArticle(cached)
      setArticleLoading(false)
      setArticleError(null)
      return
    }
    const requestId = ++articleRequestRef.current
    setArticle(null)
    setArticleLoading(true)
    setArticleError(null)
    try {
      const params = new URLSearchParams({ server: post.server, id: post.id })
      const response = await fetch(`/api/news/article?${params}`)
      const data = await response.json() as OfficialNewsArticle & { error?: string }
      if (!response.ok) throw new Error(data.error || 'Official news is temporarily unavailable.')
      if (requestId !== articleRequestRef.current) return
      articleCacheRef.current.set(key, data)
      setArticle(data)
    } catch (reason) {
      if (requestId === articleRequestRef.current) setArticleError(reason instanceof Error ? reason.message : 'Official news is temporarily unavailable.')
    } finally {
      if (requestId === articleRequestRef.current) setArticleLoading(false)
    }
  }, [])

  function openPost(post: NewsPost) {
    setSelectedPost(post)
    const cachedTranslation = translationCacheRef.current.get(`${post.server}:${post.id}`) || null
    setTranslatedHtml(cachedTranslation?.contentHtml || null)
    setTranslatedTitle(cachedTranslation?.title || null)
    setShowingTranslation(false)
    setTranslationError(null)
    void loadArticle(post)
  }

  async function translateArticle(post: NewsPost) {
    setTranslating(true)
    setTranslationProgress(0)
    setTranslationError(null)
    try {
      let data: { title?: string; contentHtml?: string; error?: string; progress?: number } = {}
      for (let step = 0; step < 30; step += 1) {
        let response: Response | null = null
        for (let attempt = 0; attempt < 3; attempt += 1) {
          response = await fetch('/api/news/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: post.id, server: post.server }) })
          if (response.ok) break
          if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)))
        }
        if (!response) throw new Error('AI translation is temporarily unavailable.')
        data = await response.json() as typeof data
        if (!response.ok) throw new Error(data.error || 'AI translation is temporarily unavailable.')
        if (response.status !== 202) break
        setTranslationProgress(typeof data.progress === 'number' ? data.progress : null)
      }
      if (!data.title || !data.contentHtml) throw new Error(data.error || 'AI translation returned an incomplete result.')
      const key = `${post.server}:${post.id}`
      translationCacheRef.current.set(key, { title: data.title, contentHtml: data.contentHtml })
      setTranslatedHtml(data.contentHtml)
      setTranslatedTitle(data.title)
      setShowingTranslation(true)
    } catch (reason) {
      setTranslationError(reason instanceof Error ? reason.message : 'AI translation is temporarily unavailable.')
    } finally {
      setTranslating(false)
      setTranslationProgress(null)
    }
  }

  function closePost() {
    articleRequestRef.current += 1
    setSelectedPost(null)
    setArticle(null)
    setArticleError(null)
    setArticleLoading(false)
    setTranslatedHtml(null)
    setTranslatedTitle(null)
    setTranslating(false)
    setTranslationProgress(null)
    setTranslationError(null)
    setShowingTranslation(false)
  }

  useEffect(() => {
    if (!selectedPost) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') closePost() }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedPost])

  const applyPage = useCallback((data: NewsPageResult, append: boolean) => {
    setCategories(data.categories)
    setPage(data.page)
    setHasMore(data.hasMore)
    setPosts((current) => {
      if (!append) return data.posts
      const merged = new Map(current.map((post) => [`${post.server}:${post.id}`, post]))
      data.posts.forEach((post) => merged.set(`${post.server}:${post.id}`, post))
      return Array.from(merged.values())
    })
  }, [])

  const loadPage = useCallback(async (nextPage: number, nextCategory: string, nextServer: NewsServer, append: boolean) => {
    const requestId = ++requestIdRef.current
    const cacheKey = `${nextServer}:${nextCategory}:${nextPage}`
    const cachedPage = pageCacheRef.current.get(cacheKey) || readSessionPage(nextServer, nextCategory, nextPage)
    const cached = nextServer.endsWith('-x') && cachedPage?.data.posts.length === 0 ? null : cachedPage

    if (cached) {
      pageCacheRef.current.set(cacheKey, cached)
      applyPage(cached.data, append)
      setLoading(false)
      setLoadingMore(false)
      setError(null)
      if (Date.now() - cached.cachedAt < NEWS_CLIENT_FRESH_MS) {
        autoLoadPendingRef.current = false
        return
      }
    } else {
      append ? setLoadingMore(true) : setLoading(true)
    }
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(nextPage), category: nextCategory, server: nextServer })
      const response = await fetch(`/api/news?${params}`, nextServer.endsWith('-x') ? { cache: 'no-store' } : undefined)
      const data = await response.json() as NewsPageResult & { error?: string }
      if (!response.ok) throw new Error(data.error || 'Official news is temporarily unavailable.')
      if (requestId !== requestIdRef.current) return
      const nextCached = { data, cachedAt: Date.now() }
      if (!nextServer.endsWith('-x') || data.posts.length > 0) {
        pageCacheRef.current.set(cacheKey, nextCached)
        writeSessionPage(nextServer, nextCategory, nextPage, nextCached)
      }
      applyPage(data, append)
    } catch (reason) {
      if (requestId === requestIdRef.current) setError(reason instanceof Error ? reason.message : 'Official news is temporarily unavailable.')
    } finally {
      if (requestId === requestIdRef.current) { setLoading(false); setLoadingMore(false) }
      autoLoadPendingRef.current = false
    }
  }, [applyPage])

  useEffect(() => { void loadPage(1, category, server, false) }, [category, loadPage, server])

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || !hasMore || loading || loadingMore || error || page < 1) return

    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting || autoLoadPendingRef.current) return
      autoLoadPendingRef.current = true
      void loadPage(page + 1, category, server, true)
    }, { rootMargin: '400px 0px' })

    observer.observe(target)
    return () => observer.disconnect()
  }, [category, error, hasMore, loadPage, loading, loadingMore, page, server])

  function selectServer(nextServer: NewsServer) {
    if (nextServer === server) return
    requestIdRef.current += 1
    setServer(nextServer)
    setCategory('all')
    setPosts([])
    setCategories([])
    setPage(0)
    setHasMore(false)
    setError(null)
    setLoading(true)
  }

  return (
    <section className="view-transition pt-7">
      <div className="mx-auto mb-4 max-w-[720px]">
        <div className="mb-1.5 text-[11px] font-bold tracking-[0.14em] text-muted">◈ SCHALE NETWORK</div>
        <h1 className="text-2xl font-bold tracking-[-0.03em] sm:text-3xl">Official Blue Archive Feed</h1>
        <p className="mt-1.5 text-[13px] text-muted2">{{ global: 'Fresh from the Global Nexon Community.', jp: 'Fresh from the official Japanese Blue Archive site.', 'global-x': 'Official posts from @EN_BlueArchive on X.', 'jp-x': 'Official posts from @Blue_ArchiveJP on X.' }[server]}</p>
      </div>

      <div className="mx-auto mb-6 max-w-[720px] overflow-hidden rounded-2xl border border-border bg-card/90 shadow-[0_10px_30px_rgba(0,0,0,0.12)] backdrop-blur-sm">
        <div className="p-3 sm:p-4">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-muted2"><Globe2 size={15} aria-hidden /> News region</div>
            <span className="rounded-full bg-green/10 px-2.5 py-1 text-[10px] font-bold text-green">Official sources</span>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-bg/70 p-1.5 sm:grid-cols-4" aria-label="News server">
            {([['global', 'Global', 'Nexon Community'], ['jp', 'Japan', 'Yostar JP'], ['global-x', 'Global X', '@EN_BlueArchive'], ['jp-x', 'Japan X', '@Blue_ArchiveJP']] as const).map(([value, label, source]) => {
              const Icon = value.endsWith('-x') ? AtSign : value === 'global' ? Globe2 : Languages
              const active = server === value
              return (
                <button key={value} type="button" onClick={() => selectServer(value)} aria-pressed={active}
                  className={`flex min-w-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all ${active ? 'bg-accent text-white shadow-[0_5px_16px_rgba(74,138,198,0.3)]' : 'text-muted2 hover:bg-card2 hover:text-text'}`}>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${active ? 'bg-white/18' : 'bg-accent/10 text-accent'}`}><Icon size={16} aria-hidden /></span>
                  <span className="min-w-0"><span className="block text-sm font-bold leading-4">{label}</span><span className={`mt-0.5 block truncate text-[10px] font-semibold ${active ? 'text-white/75' : 'text-muted'}`}>{source}</span></span>
                </button>
              )
            })}
          </div>
        </div>

        {categories.length > 0 && (
          <div className="border-t border-border px-3 pb-2 pt-3 sm:px-4">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted"><SlidersHorizontal size={13} aria-hidden /> Filter posts</div>
            <div className="horizontal-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2 pt-1" aria-label="News categories">
              {['all', ...categories].map((item) => (
                <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${category === item ? 'border-accent/40 bg-accent/15 text-accent shadow-[inset_0_0_0_1px_rgba(74,138,198,0.08)]' : 'border-border bg-bg/40 text-muted2 hover:border-border2 hover:bg-card2 hover:text-text'}`}>
                  {item === 'all' ? 'All posts' : item}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading ? <NewsSkeleton /> : error && posts.length === 0 ? (
        <div className="mx-auto max-w-[720px] rounded-2xl border border-border bg-card px-5 py-14 text-center">
          <Newspaper className="mx-auto mb-3 text-muted" size={34} aria-hidden /><div className="font-semibold">Official feed is unavailable</div><p className="mt-2 text-sm text-muted2">{error}</p>
          <button type="button" onClick={() => void loadPage(1, category, server, false)} className="mt-5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">Try again</button>
        </div>
      ) : posts.length === 0 ? (
        <div className="mx-auto max-w-[720px] rounded-2xl border border-border bg-card px-5 py-14 text-center text-sm text-muted2">{server.endsWith('-x') ? 'X posts are being collected. Check back shortly.' : 'No official posts are available in this category.'}</div>
      ) : (
        <>
          <div className="mx-auto max-w-[720px] space-y-4">
            {posts.map((post) => {
              return (
                <article key={`${post.server}:${post.id}`} className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <OfficialAvatar post={post} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-sm font-bold"><span>{post.authorName}</span><BadgeCheck size={16} className="fill-accent text-bg" aria-label="Official account" /></div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted2"><span>{regionLabel(post.server)}</span>{post.source === 'x' && <><span aria-hidden>·</span><span>{post.server === 'global-x' ? '@EN_BlueArchive' : '@Blue_ArchiveJP'}</span></>}<span aria-hidden>·</span><time dateTime={post.publishedAt}>{formatPublishedAt(post.publishedAt)}</time><span aria-hidden>·</span><Globe2 size={12} aria-label="Public post" /></div>
                      </div>
                      <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-accent">{post.category}</span>
                    </div>
                    {post.source === 'x' ? <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-text">{post.summary}</p> : <><h2 className="mt-4 text-[17px] font-bold leading-snug tracking-[-0.01em] text-text sm:text-lg">{post.title}</h2>{post.summary && <p className="mt-2 text-sm leading-relaxed text-muted2">{post.summary}</p>}</>}
                    <LinkPreview post={post} />
                    {post.quotedPost && <a href={post.quotedPost.url} target="_blank" rel="noopener noreferrer" className="mt-3 block overflow-hidden rounded-xl border border-border bg-bg/50 text-sm hover:border-accent/40"><span className="block p-3"><span className="font-bold">{post.quotedPost.authorName}</span><span className="mt-1 block whitespace-pre-wrap text-muted2">{post.quotedPost.text}</span></span>{post.quotedPost.media[0] && <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageSource(post.quotedPost.media[0].url) || undefined} alt="" className="max-h-64 w-full border-t border-border object-cover" />
                    </>}</a>}
                  </div>
                  <PostMedia post={post} onOpen={() => openPost(post)} />
                  <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                    <button type="button" onClick={() => openPost(post)} className="text-xs font-bold text-muted2 transition-colors hover:text-accent">Show more</button>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => requestPlanaNewsSummary({ threadId: post.id, title: post.title, server: post.server })} className="inline-flex items-center gap-1.5 rounded-full bg-[#fc96ab]/10 px-3 py-1.5 text-xs font-bold text-[#fc96ab] transition-colors hover:bg-[#fc96ab] hover:text-white">
                        <Sparkles size={13} aria-hidden /> Summarize
                      </button>
                      <a href={post.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent transition-colors hover:bg-accent hover:text-white">
                        {post.source === 'x' ? 'Open on X' : 'Read post'} <ArrowUpRight size={13} aria-hidden />
                      </a>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
          {error && (
            <div className="mx-auto mt-5 max-w-[720px] rounded-xl border border-red/25 bg-red/10 px-4 py-3 text-center text-sm text-red">
              <div>{error} Your loaded posts are still available.</div>
              <button type="button" onClick={() => void loadPage(page + 1, category, server, true)} className="mt-2 rounded-full border border-red/30 px-3 py-1.5 text-xs font-bold transition-colors hover:bg-red/10">Retry older posts</button>
            </div>
          )}
          {hasMore && !error && (
            <div ref={loadMoreRef} className="mt-5 flex h-14 items-center justify-center" aria-live="polite">
              {loadingMore && (
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-border2 border-t-accent" aria-hidden />
                  Loading older posts…
                </span>
              )}
            </div>
          )}
        </>
      )}
      {selectedPost && createPortal(
        <NewsPostModal
          post={selectedPost}
          article={article}
          loading={articleLoading}
          error={articleError}
          onClose={closePost}
          onRetry={() => void loadArticle(selectedPost)}
          translatedHtml={translatedHtml}
          translatedTitle={translatedTitle}
          translating={translating}
          translationProgress={translationProgress}
          translationError={translationError}
          showingTranslation={showingTranslation}
          onTranslate={() => void translateArticle(selectedPost)}
          onToggleTranslation={() => setShowingTranslation((current) => !current)}
        />,
        document.body
      )}
    </section>
  )
}
