import { NextResponse } from 'next/server'

const ALLOWED_HOSTS = [
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
]

function resolveDriveUrl(url: string): string {
  // https://drive.google.com/file/d/FILE_ID/view?...
  const match = url.match(/\/file\/d\/([^/?]+)/)
  if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`
  return url
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const raw = searchParams.get('url')
  if (!raw) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  let url: string
  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'https:') return NextResponse.json({ error: 'HTTPS only' }, { status: 400 })
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      return NextResponse.json({ error: 'Host not allowed' }, { status: 403 })
    }
    url = parsed.hostname === 'drive.google.com' ? resolveDriveUrl(raw) : raw
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  let res: Response
  try {
    res = await fetch(url, { redirect: 'follow' })
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 })
  }

  if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 })

  const contentType = res.headers.get('content-type') || 'image/jpeg'
  if (!contentType.startsWith('image/')) {
    return NextResponse.json({ error: 'Not an image' }, { status: 422 })
  }

  const buffer = await res.arrayBuffer()
  return new Response(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
    },
  })
}
