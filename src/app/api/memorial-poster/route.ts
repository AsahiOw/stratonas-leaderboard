import fsPromises from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'

const POSTERS_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), 'Development_data', 'lobby-posters')

const POSTER_TYPES = [
  { ext: '.jpg', contentType: 'image/jpeg' },
  { ext: '.webp', contentType: 'image/webp' },
]

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function posterBaseName(file: string) {
  const parsed = path.parse(file)
  if (!parsed.name || path.basename(file) !== file) return null

  const ext = parsed.ext.toLowerCase()
  if (ext && ext !== '.mp4' && ext !== '.webp' && ext !== '.jpg' && ext !== '.jpeg') return null

  return parsed.name
}

export async function GET(request: NextRequest) {
  const file = request.nextUrl.searchParams.get('file')
  if (!file) {
    return NextResponse.json({ error: 'Invalid memorial poster' }, { status: 400 })
  }

  const posterBase = posterBaseName(file)
  if (!posterBase) {
    return NextResponse.json({ error: 'Invalid memorial poster' }, { status: 400 })
  }

  try {
    let filePath = ''
    let contentType = ''
    for (const posterType of POSTER_TYPES) {
      const nextPath = path.join(/*turbopackIgnore: true*/ POSTERS_DIR, `${posterBase}${posterType.ext}`)
      try {
        const stats = await fsPromises.stat(nextPath)
        if (stats.isFile()) {
          filePath = nextPath
          contentType = posterType.contentType
          break
        }
      } catch {
        continue
      }
    }

    if (!filePath) throw new Error('Poster not found')

    const stats = await fsPromises.stat(filePath)
    const image = await fsPromises.readFile(filePath)
    const etag = `"${stats.size}-${Math.floor(stats.mtimeMs)}"`

    if (request.headers.get('if-none-match') === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
          'ETag': etag,
          'Last-Modified': stats.mtime.toUTCString(),
        },
      })
    }

    return new Response(image, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(image.byteLength),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'ETag': etag,
        'Last-Modified': stats.mtime.toUTCString(),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Memorial poster not found' }, { status: 404 })
  }
}
