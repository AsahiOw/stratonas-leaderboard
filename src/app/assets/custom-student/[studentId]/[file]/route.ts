import { readFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { CUSTOM_STUDENT_ASSET_DIR } from '@/lib/custom-student-media'

const CONTENT_TYPES: Record<string, string> = {
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ studentId: string; file: string }> }) {
  const { studentId, file } = await params
  if (!/^\d+$/.test(studentId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (path.basename(file) !== file) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ext = path.extname(file).toLowerCase()
  const contentType = CONTENT_TYPES[ext]
  if (!contentType) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const buffer = await readFile(path.join(CUSTOM_STUDENT_ASSET_DIR, studentId, file))
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
