import fs from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { RADIO_AUDIO_DIR } from '@/lib/radio-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const CHUNK = 256 * 1024

function parseRange(value: string | null, size: number) {
  if (!value) return null
  const match = value.match(/^bytes=(\d*)-(\d*)$/)
  if (!match) return null
  const start = match[1] ? Number(match[1]) : 0
  const end = match[2] ? Number(match[2]) : size - 1
  return Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end >= start && end < size ? { start, end } : null
}

async function streamFile(filePath: string, start: number, end: number) {
  const file = await fs.open(filePath, 'r')
  let position = start
  let closed = false
  const close = async () => { if (!closed) { closed = true; await file.close().catch(() => undefined) } }
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const remaining = end - position + 1
      if (remaining <= 0) { controller.close(); void close(); return }
      const buffer = Buffer.allocUnsafe(Math.min(CHUNK, remaining))
      try {
        const { bytesRead } = await file.read(buffer, 0, buffer.length, position)
        if (!bytesRead) { controller.close(); void close(); return }
        position += bytesRead
        controller.enqueue(buffer.subarray(0, bytesRead))
      } catch (error) { await close(); controller.error(error) }
    },
    async cancel() { await close() },
  })
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const track = await prisma.radioTrack.findUnique({ where: { id } })
  if (!track?.audioFileName || track.status !== 'ready') return NextResponse.json({ error: 'Radio track not found.' }, { status: 404 })
  try {
    const filePath = path.join(RADIO_AUDIO_DIR, track.audioFileName)
    const stats = await fs.stat(filePath)
    if (!stats.isFile()) throw new Error('Not a file')
    const requestedRange = request.headers.get('range')
    const range = parseRange(requestedRange, stats.size)
    if (requestedRange && !range) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${stats.size}` } })
    const start = range?.start ?? 0
    const end = range?.end ?? stats.size - 1
    const headers = new Headers({
      'Accept-Ranges': 'bytes', 'Content-Type': 'audio/mp4', 'Content-Length': String(end - start + 1),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'ETag': `"${stats.size}-${Math.floor(stats.mtimeMs)}"`, 'Last-Modified': stats.mtime.toUTCString(),
    })
    if (range) headers.set('Content-Range', `bytes ${start}-${end}/${stats.size}`)
    return new Response(await streamFile(filePath, start, end), { status: range ? 206 : 200, headers })
  } catch { return NextResponse.json({ error: 'Radio track not found.' }, { status: 404 }) }
}
