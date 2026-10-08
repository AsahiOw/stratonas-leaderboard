export type ModelDownloadProgress = { loaded: number; total: number | null }

const recentModels = new Map<string, ArrayBuffer>()
const maxCachedBytes = 128 * 1024 * 1024
let cachedBytes = 0

// Only checksum-addressed public models are immutable. Admin previews remain uncached.
function publicModelUrl(url: string) {
  return /^\/assets\/chibi\/[a-zA-Z0-9_-]{1,100}\/[a-f0-9]{64}\.glb(?:\?part=(?:initial|animation)&clip=[^&]*&v=1)?$/.test(url)
}

function rememberModel(url: string, buffer: ArrayBuffer) {
  if (!publicModelUrl(url) || buffer.byteLength > maxCachedBytes) return
  const previous = recentModels.get(url)
  if (previous) { cachedBytes -= previous.byteLength; recentModels.delete(url) }
  while (cachedBytes + buffer.byteLength > maxCachedBytes) {
    const oldest = recentModels.keys().next().value!
    cachedBytes -= recentModels.get(oldest)!.byteLength
    recentModels.delete(oldest)
  }
  recentModels.set(url, buffer); cachedBytes += buffer.byteLength
}

export async function downloadChibiModel(url: string, signal: AbortSignal, onProgress: (progress: ModelDownloadProgress) => void) {
  signal.throwIfAborted()
  const cached = recentModels.get(url)
  if (cached) {
    recentModels.delete(url); recentModels.set(url, cached)
    onProgress({ loaded: cached.byteLength, total: cached.byteLength })
    return cached
  }
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  // Content-Length describes compressed bytes when Content-Encoding is set;
  // fetch exposes decoded bytes, so that length cannot give a truthful percent.
  const length = Number(response.headers.get('Content-Length'))
  const encoding = response.headers.get('Content-Encoding')
  const total = Number.isFinite(length) && length > 0 && (!encoding || encoding === 'identity') ? length : null
  onProgress({ loaded: 0, total })
  if (!response.body) {
    const buffer = await response.arrayBuffer()
    signal.throwIfAborted(); onProgress({ loaded: buffer.byteLength, total })
    rememberModel(url, buffer)
    return buffer
  }
  const reader = response.body.getReader(), chunks: Uint8Array[] = []
  let loaded = 0
  try {
    while (true) {
      signal.throwIfAborted()
      const { done, value } = await reader.read()
      signal.throwIfAborted()
      if (done) break
      chunks.push(value); loaded += value.byteLength
      onProgress({ loaded, total })
    }
  } catch (cause) {
    await reader.cancel().catch(() => {})
    throw cause
  } finally { reader.releaseLock() }
  const buffer = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength }
  signal.throwIfAborted()
  rememberModel(url, buffer.buffer)
  return buffer.buffer
}
