import { NextResponse } from 'next/server'
import { safeFetch } from '@/lib/safe-fetch'

export const dynamic = 'force-dynamic'
const X_VIDEO_HOSTS = new Set(['video.twimg.com'])

function safeVideoUrl(value: string | null): URL | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'video.twimg.com' && url.pathname.endsWith('.mp4') ? url : null
  } catch { return null }
}

export async function GET(request: Request) {
  const url = safeVideoUrl(new URL(request.url).searchParams.get('url'))
  if (!url) return NextResponse.json({ error: 'Invalid X video URL.' }, { status: 400 })

  try {
    const range = request.headers.get('range')
    if (range && !/^bytes=\d*-\d*$/.test(range)) {
      return NextResponse.json({ error: 'Invalid range.' }, { status: 416 })
    }
    const upstream = await safeFetch(url, {
      allowedHosts: X_VIDEO_HOSTS,
      headers: range ? { Range: range } : undefined,
    })
    const contentType = upstream.headers.get('content-type') || ''
    if ((!upstream.ok && upstream.status !== 206) || !contentType.startsWith('video/')) {
      return NextResponse.json({ error: 'X video is unavailable.' }, { status: 502 })
    }
    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Accept-Ranges': upstream.headers.get('accept-ranges') || 'bytes',
    })
    for (const name of ['content-length', 'content-range']) {
      const value = upstream.headers.get(name)
      if (value) headers.set(name, value)
    }
    return new Response(upstream.body as ReadableStream, { status: upstream.status, headers })
  } catch {
    return NextResponse.json({ error: 'X video is unavailable.' }, { status: 502 })
  }
}
