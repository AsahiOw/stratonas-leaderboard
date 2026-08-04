import fs from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { RADIO_THUMBNAIL_DIR } from '@/lib/radio-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const track = await prisma.radioTrack.findUnique({ where: { id } })
  if (!track?.thumbnailFileName || track.status !== 'ready') return NextResponse.json({ error: 'Thumbnail not found.' }, { status: 404 })
  try {
    const filePath = path.join(RADIO_THUMBNAIL_DIR, track.thumbnailFileName)
    const stats = await fs.stat(filePath)
    const etag = `"${stats.size}-${Math.floor(stats.mtimeMs)}"`
    if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304 })
    return new Response(await fs.readFile(filePath), { headers: {
      'Content-Type': 'image/webp', 'Content-Length': String(stats.size),
      'Cache-Control': 'public, max-age=31536000, immutable', 'ETag': etag, 'Last-Modified': stats.mtime.toUTCString(),
    } })
  } catch { return NextResponse.json({ error: 'Thumbnail not found.' }, { status: 404 }) }
}
