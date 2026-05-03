'use client'

const CACHE_NAME = 'stratonas-memorial-videos-v1'
const objectUrls = new Map<string, string>()
const pendingFetches = new Map<string, Promise<string>>()
const pendingStores = new Map<string, Promise<void>>()

function canCacheVideo(url: string) {
  return url.startsWith('/api/memorial-video')
}

async function responseToObjectUrl(url: string, response: Response) {
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  objectUrls.set(url, objectUrl)
  return objectUrl
}

async function fetchAndStoreVideo(url: string) {
  await pendingStores.get(url)?.catch(() => undefined)

  const cache = 'caches' in window ? await caches.open(CACHE_NAME) : null
  const cached = await cache?.match(url)
  if (cached) return responseToObjectUrl(url, cached)

  const response = await fetch(url, { cache: 'force-cache' })
  if (!response.ok) throw new Error(`Unable to cache memorial video: ${url}`)

  if (cache) await cache.put(url, response.clone())
  return responseToObjectUrl(url, response)
}

async function storeVideo(url: string) {
  if (!('caches' in window)) return
  if (objectUrls.has(url) || pendingFetches.has(url)) return

  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(url)
  if (cached) return

  const response = await fetch(url, { cache: 'force-cache' })
  if (response.ok) await cache.put(url, response)
}

export function getCachedMemorialVideoUrl(url: string) {
  if (!canCacheVideo(url)) return Promise.resolve(url)

  const objectUrl = objectUrls.get(url)
  if (objectUrl) return Promise.resolve(objectUrl)

  const pending = pendingFetches.get(url)
  if (pending) return pending

  const next = fetchAndStoreVideo(url).finally(() => pendingFetches.delete(url))
  pendingFetches.set(url, next)
  return next
}

export function warmMemorialVideoCache(urls: string[]) {
  const uniqueUrls = Array.from(new Set(urls.filter(canCacheVideo)))

  void (async () => {
    for (const url of uniqueUrls) {
      if (pendingStores.has(url)) {
        await pendingStores.get(url)?.catch(() => undefined)
        continue
      }

      const pending = storeVideo(url).finally(() => pendingStores.delete(url))
      pendingStores.set(url, pending)
      await pending.catch(() => undefined)
    }
  })()
}
