import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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

  const controller = new AbortController()
  const connectionTimeout = setTimeout(() => controller.abort(), 20_000)
  try {
    const range = request.headers.get('range')
    const upstream = await fetch(url, {
      headers: range ? { Range: range } : undefined,
      cache: 'no-store',
      signal: controller.signal,
    })
    clearTimeout(connectionTimeout)
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
    return new Response(upstream.body, { status: upstream.status, headers })
  } catch {
    clearTimeout(connectionTimeout)
    return NextResponse.json({ error: 'X video is unavailable.' }, { status: 502 })
  }
}
