import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { prisma } from '@/lib/prisma'
import { existingArtifactPath } from './storage'

export async function serveChibiArtifact(request: Request, assetId: string, revision: string, preview = false, db = prisma) {
  const missing = () => new Response('Model not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(assetId) || !/^[a-f0-9]{64}\.glb$/.test(revision)) return missing()
  const asset = await db.chibiAsset.findUnique({ where: { id: assetId } })
  if (!asset || asset.checksum !== revision.slice(0, -4) || (!preview && !asset.published)
    || (asset.validation as { valid?: boolean }).valid !== true) return missing()
  let filename: string
  let size: number
  try {
    filename = await existingArtifactPath(asset.fileKey)
    const info = await stat(/*turbopackIgnore: true*/ filename)
    if (!info.isFile()) return missing()
    size = info.size
  } catch { return missing() }
  const headers = new Headers({
    'Content-Type': 'model/gltf-binary', 'X-Content-Type-Options': 'nosniff',
    'Cache-Control': preview ? 'private, no-store' : 'public, max-age=31536000, immutable',
    ETag: `"${asset.checksum}"`,
  })
  if (!preview && request.headers.get('if-none-match')?.split(',').map(value => value.trim()).includes(headers.get('ETag')!)) {
    return new Response(null, { status: 304, headers })
  }
  headers.set('Content-Length', String(size))
  if (request.method === 'HEAD') return new Response(null, { headers })
  // The response owns the stream lifecycle. Passing the request signal into
  // createReadStream makes a client-side navigation abort surface as an
  // unhandled Node stream error while Next is still consuming this response.
  const stream = createReadStream(/*turbopackIgnore: true*/ filename)
  return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { headers })
}
