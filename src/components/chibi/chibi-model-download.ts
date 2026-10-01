export type ModelDownloadProgress = { loaded: number; total: number | null }

export async function downloadChibiModel(url: string, signal: AbortSignal, onProgress: (progress: ModelDownloadProgress) => void) {
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
  return buffer.buffer
}
