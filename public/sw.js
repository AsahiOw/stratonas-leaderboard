const CACHE_NAME = 'stratonas-pwa-v1'
const APP_ASSETS = [
  '/icons/pwa-192.png',
  '/icons/pwa-512.png',
  '/icons/pwa-maskable-512.png',
]

const isDevelopmentHost = ['localhost', '127.0.0.1'].includes(self.location.hostname)

self.addEventListener('install', (event) => {
  self.skipWaiting()
  if (!isDevelopmentHost) {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS)))
  }
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (isDevelopmentHost || request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => new Response(offlinePage(), {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }))
    )
    return
  }

  const isVersionedNextAsset = url.pathname.startsWith('/_next/static/')
  const isAppIcon = url.pathname.startsWith('/icons/')
  if (!isVersionedNextAsset && !isAppIcon) return

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
      }
      return response
    }))
  )
})

function offlinePage() {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#17121f"><title>Stratónas — Offline</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#17121f;color:#f5efff;font:16px system-ui,sans-serif;text-align:center}main{padding:2rem}img{width:128px;height:128px}h1{margin:.8rem 0 .4rem}p{color:#c9bdd6}button{margin-top:1rem;padding:.7rem 1rem;border:0;border-radius:.6rem;background:#ffd04a;color:#211a09;font-weight:700}</style>
</head><body><main><img src="/icons/pwa-192.png" alt=""><h1>You are offline</h1><p>Reconnect to load the latest Stratónas data.</p><button onclick="location.reload()">Try again</button></main></body></html>`
}
