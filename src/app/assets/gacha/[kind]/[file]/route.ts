import { readFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { GACHA_ASSET_DIRS, type RecruitmentAssetKind } from '@/lib/recruitment-media'

const CONTENT_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.m4v': 'video/x-m4v',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isRecruitmentAssetKind(value: string): value is RecruitmentAssetKind {
  return value === 'banner' || value === 'animation'
}

export async function GET(_req: Request, { params }: { params: Promise<{ kind: string; file: string }> }) {
  const { kind, file } = await params
  if (!isRecruitmentAssetKind(kind) || path.basename(file) !== file) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const ext = path.extname(file).toLowerCase()
  const contentType = CONTENT_TYPES[ext]
  if (!contentType) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const buffer = await readFile(path.join(GACHA_ASSET_DIRS[kind], file))
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
