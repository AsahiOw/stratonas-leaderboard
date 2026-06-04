import { readFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { CLUB_LOGO_DIR } from '@/lib/club-logo-upload'

const CONTENT_TYPES: Record<string, string> = {
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  if (path.basename(file) !== file) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ext = path.extname(file).toLowerCase()
  const contentType = CONTENT_TYPES[ext]
  if (!contentType) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const buffer = await readFile(path.join(CLUB_LOGO_DIR, file))
    return new NextResponse(buffer, {
      headers: {
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=2592000',
        'Content-Type': contentType,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
