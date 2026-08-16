import { NextResponse } from 'next/server'
import { readLimitedResponse, safeFetch } from '@/lib/safe-fetch'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_HOSTS = new Set([
  'drive.google.com',
  'lh3.googleusercontent.com',
  'i.imgur.com',
  'res.cloudinary.com',
  'cdn.discordapp.com',
  'media.discordapp.net',
  'schaledb.com',
  'static.wikia.nocookie.net',
  'static.fandom.net',
  'static.wikitide.net',
  'bluearchive.wiki',
  'copyparty.lazyc97.top',
  'www.plana-stats.com',
  'dszw1qtcnsa5e.cloudfront.net',
  'webusstatic.yo-star.com',
  'pbs.twimg.com',
])

function resolveDriveUrl(url: string): string {
  // https://drive.google.com/file/d/FILE_ID/view?...
  const match = url.match(/\/file\/d\/([^/?]+)/)
  if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`
  return url
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const raw = searchParams.get('url')
  const isNewsMedia = searchParams.get('cache') === 'news'
  if (!raw) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  let url: string
  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'https:') return NextResponse.json({ error: 'HTTPS only' }, { status: 400 })
    if (!ALLOWED_HOSTS.has(parsed.hostname)) {
      return NextResponse.json({ error: 'Host not allowed' }, { status: 403 })
    }
    url = parsed.hostname === 'drive.google.com' ? resolveDriveUrl(raw) : raw
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  let res: Awaited<ReturnType<typeof safeFetch>>
  try {
    res = await safeFetch(url, { allowedHosts: ALLOWED_HOSTS })
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 })
  }

  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })

  const contentType = res.headers.get('content-type') || 'image/jpeg'
  const normalizedContentType = contentType.split(';', 1)[0].trim().toLowerCase()
  if (!ALLOWED_IMAGE_TYPES.has(normalizedContentType)) {
    return NextResponse.json({ error: 'Not an image' }, { status: 422 })
  }

  let buffer: Buffer
  try {
    buffer = await readLimitedResponse(res, MAX_IMAGE_BYTES)
  } catch {
    return NextResponse.json({ error: 'Image is too large' }, { status: 413 })
  }
  const cacheControl = isNewsMedia
    ? 'public, max-age=2592000, stale-while-revalidate=604800'
    : 'public, max-age=86400, stale-while-revalidate=3600'
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
    },
  })
}
