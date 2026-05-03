import fsPromises from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'

const LOBBIES_DIR = path.join(process.cwd(), 'Development_data', 'lobbies')
const VIDEO_CONTENT_TYPE = 'video/mp4'
const STREAM_CHUNK_SIZE = 1024 * 256

export const runtime = 'nodejs'

function parseRange(range: string | null, size: number) {
  if (!range) return null

  const match = range.match(/^bytes=(\d*)-(\d*)$/)
  if (!match) return null

  const startText = match[1]
  const endText = match[2]
  const start = startText ? Number(startText) : 0
  const end = endText ? Number(endText) : size - 1

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end >= size) {
    return null
  }

  return { start, end }
}

async function createFileStream(filePath: string, start: number, end: number) {
  const file = await fsPromises.open(filePath, 'r')
  let position = start
  let closed = false

  const close = async () => {
    if (closed) return
    closed = true
    await file.close().catch(() => undefined)
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (closed) return

      const remaining = end - position + 1
      if (remaining <= 0) {
        controller.close()
        void close()
        return
      }

      const length = Math.min(STREAM_CHUNK_SIZE, remaining)
      const buffer = Buffer.allocUnsafe(length)

      try {
        const { bytesRead } = await file.read(buffer, 0, length, position)
        if (closed) return

        if (bytesRead <= 0) {
          controller.close()
          void close()
          return
        }

        position += bytesRead
        controller.enqueue(buffer.subarray(0, bytesRead))
      } catch (error) {
        if (closed) return
        await close()
        controller.error(error)
      }
    },
    async cancel() {
      await close()
    },
  })
}

export async function GET(request: NextRequest) {
  const file = request.nextUrl.searchParams.get('file')
  if (!file || path.basename(file) !== file || path.extname(file).toLowerCase() !== '.mp4') {
    return NextResponse.json({ error: 'Invalid memorial video' }, { status: 400 })
  }

  const filePath = path.join(LOBBIES_DIR, file)

  try {
    const stats = await fsPromises.stat(filePath)
    if (!stats.isFile()) throw new Error('Not a file')

    const range = parseRange(request.headers.get('range'), stats.size)
    const headers = new Headers({
      'Accept-Ranges': 'bytes',
      'Content-Type': VIDEO_CONTENT_TYPE,
      'Cache-Control': 'public, max-age=3600',
    })

    if (range) {
      const chunkSize = range.end - range.start + 1
      headers.set('Content-Length', String(chunkSize))
      headers.set('Content-Range', `bytes ${range.start}-${range.end}/${stats.size}`)

      const stream = await createFileStream(filePath, range.start, range.end)
      return new Response(stream, {
        status: 206,
        headers,
      })
    }

    headers.set('Content-Length', String(stats.size))
    const stream = await createFileStream(filePath, 0, stats.size - 1)
    return new Response(stream, { headers })
  } catch {
    return NextResponse.json({ error: 'Memorial video not found' }, { status: 404 })
  }
}
