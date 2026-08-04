'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowUpRight, BadgeCheck, Newspaper } from 'lucide-react'
import type { NewsPageResult, NewsPost } from '@/lib/blue-archive-news'

const LATEST_CACHE_KEY = 'stratonas:news:latest:v1'
const FULL_FEED_CACHE_KEY = 'stratonas:news:v1:all:1'
const FRESH_MS = 5 * 60 * 1000

type CachedLatest = { post: NewsPost; cachedAt: number }
type CachedFullFeed = { data: NewsPageResult; cachedAt: number }

function imageSource(url: string | null): string | null {
  return url ? `/api/image-proxy?url=${encodeURIComponent(url)}` : null
}

function readCachedLatest(): CachedLatest | null {
  try {
    const fullRaw = window.sessionStorage.getItem(FULL_FEED_CACHE_KEY)
    if (fullRaw) {
      const full = JSON.parse(fullRaw) as CachedFullFeed
      if (full.data?.posts?.[0] && typeof full.cachedAt === 'number') {
        return { post: full.data.posts[0], cachedAt: full.cachedAt }
      }
    }
    const raw = window.sessionStorage.getItem(LATEST_CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw) as CachedLatest
    return cached?.post && typeof cached.cachedAt === 'number' ? cached : null
  } catch {
    return null
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  }).format(new Date(value))
}

export function LatestNewsSection({ onOpenNews }: { onOpenNews: () => void }) {
  const [post, setPost] = useState<NewsPost | null>(null)
  const [loading, setLoading] = useState(true)

  const loadLatest = useCallback(async () => {
    const cached = readCachedLatest()
    if (cached) {
      setPost(cached.post)
      setLoading(false)
      if (Date.now() - cached.cachedAt < FRESH_MS) return
    }

    try {
      const response = await fetch('/api/news?page=1&category=all&limit=1')
      if (!response.ok) throw new Error('Unable to load latest news')
      const data = await response.json() as NewsPageResult
      const latest = data.posts[0]
      if (!latest) return
      setPost(latest)
      try {
        window.sessionStorage.setItem(LATEST_CACHE_KEY, JSON.stringify({ post: latest, cachedAt: Date.now() }))
      } catch {
        // The preview still works if session storage is unavailable.
      }
    } catch {
      // News is supplementary and must not affect the leaderboard.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadLatest() }, [loadLatest])

  if (!loading && !post) return null

  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_10px_28px_rgba(0,0,0,0.16)]" aria-label="Latest official Blue Archive news">
      {loading && !post ? (
        <div className="grid min-h-[170px] animate-pulse sm:grid-cols-[1fr_260px]">
          <div className="space-y-3 p-5"><div className="h-3 w-28 rounded bg-border2" /><div className="h-5 w-4/5 rounded bg-border2" /><div className="h-3 w-full rounded bg-border2" /><div className="h-3 w-2/3 rounded bg-border2" /></div>
          <div className="min-h-36 bg-card2" />
        </div>
      ) : post ? (
        <div className="grid sm:grid-cols-[minmax(0,1fr)_260px]">
          <div className="flex min-w-0 flex-col p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-accent">
                <Newspaper size={14} aria-hidden /> Latest from Schale
              </div>
              <button type="button" onClick={onOpenNews} className="shrink-0 text-xs font-semibold text-muted2 transition-colors hover:text-accent">View all</button>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted2">
              <span className="font-semibold text-text">{post.authorName}</span><BadgeCheck size={14} className="fill-accent text-card" aria-label="Official account" /><span>·</span><time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time><span>·</span><span>{post.category}</span>
            </div>
            <h2 className="mt-2 line-clamp-2 text-base font-bold leading-snug text-text sm:text-lg">{post.title}</h2>
            {post.summary && <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted2">{post.summary}</p>}
            <div className="mt-auto pt-3">
              <a href={post.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:text-accent/80">Read official post <ArrowUpRight size={13} aria-hidden /></a>
            </div>
          </div>
          {post.thumbnailUrl ? (
            <a href={post.url} target="_blank" rel="noopener noreferrer" className="group order-first block h-36 overflow-hidden border-b border-border bg-card2 sm:order-none sm:h-full sm:min-h-[180px] sm:border-b-0 sm:border-l" aria-label={`Open ${post.title} on the official site`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageSource(post.thumbnailUrl) || undefined} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
