import { NextRequest, NextResponse } from 'next/server'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const isProduction = process.env.NODE_ENV === 'production'
const trustProxyIpHeaders = process.env.TRUST_PROXY_IP_HEADERS === 'true'
const JSON_MAX_BYTES = 256 * 1024
const CHAT_MAX_BYTES = 512 * 1024
const URL_ENCODED_MAX_BYTES = 64 * 1024
const IMAGE_FORM_MAX_BYTES = 10 * 1024 * 1024
const XLSX_FORM_MAX_BYTES = 32 * 1024 * 1024
const RECRUITMENT_FORM_MAX_BYTES = 250 * 1024 * 1024
const MAX_URL_LENGTH = 8 * 1024
const MAX_PATH_LENGTH = 2 * 1024
const MAX_QUERY_PARAMETERS = 50
const MAX_QUERY_KEY_LENGTH = 100
const MAX_QUERY_VALUE_LENGTH = 4 * 1024
const MAX_JSON_DEPTH = 20
const MAX_JSON_ITEMS = 10_000
const MAX_JSON_STRING_LENGTH = 100_000
const FORBIDDEN_JSON_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const UNSAFE_CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/
type RateLimitEntry = { count: number; resetAt: number }
const rateLimitStore = new Map<string, RateLimitEntry>()

function normalizeCsp(directives: string[]) {
  return directives.join('; ').replace(/\s{2,}/g, ' ').trim()
}

function contentSecurityPolicy(nonce: string) {
  const devConnectSources = isProduction
    ? []
    : ['http://localhost:*', 'http://127.0.0.1:*', 'ws://localhost:*', 'ws://127.0.0.1:*']
  const connectSources = ["'self'", ...devConnectSources].join(' ')

  return normalizeCsp([
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProduction ? '' : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    `connect-src ${connectSources}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    ...(isProduction ? ['upgrade-insecure-requests'] : []),
  ])
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (!origin) return request.headers.get('sec-fetch-site') !== 'cross-site'

  try {
    const configuredUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL
    const expectedOrigin = configuredUrl ? new URL(configuredUrl).origin : request.nextUrl.origin
    return new URL(origin).origin === expectedOrigin
  } catch {
    return false
  }
}

function applySecurityHeaders(response: NextResponse, csp: string) {
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=()',
  )
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  response.headers.set('X-XSS-Protection', '0')

  if (isProduction) {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  return response
}

function clientAddress(request: NextRequest) {
  if (!trustProxyIpHeaders) return 'direct-client'
  return request.headers.get('cf-connecting-ip')
    || request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',', 1)[0]?.trim()
    || 'direct-client'
}

function rateLimitRule(pathname: string, method: string) {
  if (pathname.startsWith('/api/auth/')) {
    return SAFE_METHODS.has(method)
      ? { bucket: 'auth-read', limit: 120, windowMs: 60_000 }
      : { bucket: 'auth-write', limit: 10, windowMs: 60_000 }
  }
  if (pathname === '/api/chat') return { bucket: 'chat', limit: 20, windowMs: 60_000 }
  if (pathname === '/api/news/translate') return { bucket: 'translation', limit: 10, windowMs: 60_000 }
  if (pathname === '/api/image-proxy') {
    return { bucket: 'media-proxy', limit: 120, windowMs: 60_000 }
  }
  if (pathname.startsWith('/api/admin/recruitments')) return { bucket: 'recruitment-upload', limit: 10, windowMs: 60_000 }
  return pathname.startsWith('/api/') ? { bucket: 'api', limit: 300, windowMs: 60_000 } : null
}

function checkRateLimit(request: NextRequest) {
  const rule = rateLimitRule(request.nextUrl.pathname, request.method)
  if (!rule) return null
  const now = Date.now()
  const key = `${rule.bucket}:${clientAddress(request)}`
  const current = rateLimitStore.get(key)
  const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + rule.windowMs } : current
  entry.count += 1
  rateLimitStore.set(key, entry)

  if (rateLimitStore.size > 10_000) {
    for (const [storedKey, stored] of rateLimitStore) {
      if (stored.resetAt <= now) rateLimitStore.delete(storedKey)
    }
    while (rateLimitStore.size > 10_000) {
      const oldestKey = rateLimitStore.keys().next().value
      if (!oldestKey) break
      rateLimitStore.delete(oldestKey)
    }
  }

  return entry.count > rule.limit ? Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) : null
}

function payloadLimit(pathname: string, contentType: string) {
  if (contentType === 'application/json') {
    return pathname === '/api/chat' ? CHAT_MAX_BYTES : JSON_MAX_BYTES
  }

  if (contentType === 'application/x-www-form-urlencoded') return URL_ENCODED_MAX_BYTES

  if (contentType === 'multipart/form-data') {
    if (pathname.startsWith('/api/admin/recruitments')) return RECRUITMENT_FORM_MAX_BYTES
    if (pathname === '/api/admin/import/xlsx') return XLSX_FORM_MAX_BYTES
    return IMAGE_FORM_MAX_BYTES
  }

  return null
}

function validateJsonValue(value: unknown, depth = 0, state = { items: 0 }) {
  if (depth > MAX_JSON_DEPTH) throw new Error('JSON nesting is too deep')
  if (typeof value === 'string') {
    if (value.length > MAX_JSON_STRING_LENGTH) throw new Error('JSON string is too long')
    if (UNSAFE_CONTROL_CHARACTERS.test(value)) throw new Error('JSON string contains unsafe characters')
  }
  if (!value || typeof value !== 'object') return

  const entries = Array.isArray(value) ? value.entries() : Object.entries(value)
  for (const [key, child] of entries) {
    state.items += 1
    if (state.items > MAX_JSON_ITEMS) throw new Error('JSON contains too many items')
    if (typeof key === 'string' && FORBIDDEN_JSON_KEYS.has(key)) {
      throw new Error('JSON contains a forbidden key')
    }
    validateJsonValue(child, depth + 1, state)
  }
}

function validateUrl(request: NextRequest) {
  if (request.url.length > MAX_URL_LENGTH || request.nextUrl.pathname.length > MAX_PATH_LENGTH) return false

  let count = 0
  for (const [key, value] of request.nextUrl.searchParams) {
    count += 1
    if (
      count > MAX_QUERY_PARAMETERS
      || key.length > MAX_QUERY_KEY_LENGTH
      || value.length > MAX_QUERY_VALUE_LENGTH
      || UNSAFE_CONTROL_CHARACTERS.test(key)
      || UNSAFE_CONTROL_CHARACTERS.test(value)
    ) return false
  }

  return true
}

async function hasRequestBody(request: NextRequest) {
  const body = request.clone().body
  if (!body) return false

  const reader = body.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return false
      if (value.byteLength > 0) return true
    }
  } finally {
    void reader.cancel().catch(() => undefined)
  }
}

export async function validatePayload(request: NextRequest) {
  const declaredLength = Number(request.headers.get('content-length') || '0')
  const rawContentType = request.headers.get('content-type')?.toLowerCase() || ''
  const contentType = rawContentType.split(';', 1)[0].trim()
  const limit = payloadLimit(request.nextUrl.pathname, contentType)

  if (!contentType) {
    if (Number.isFinite(declaredLength) && declaredLength > 0) {
      return { status: 415, error: 'Unsupported content type' }
    }
    if (!await hasRequestBody(request)) return null
  }
  if (limit === null) return { status: 415, error: 'Unsupported content type' }
  if (contentType === 'multipart/form-data') {
    if (!Number.isFinite(declaredLength) || declaredLength <= 0) {
      return { status: 411, error: 'Content-Length is required for uploads' }
    }
    return declaredLength > limit ? { status: 413, error: 'Payload too large' } : null
  }
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    return { status: 413, error: 'Payload too large' }
  }

  const bytes = await request.clone().arrayBuffer()
  if (bytes.byteLength > limit) return { status: 413, error: 'Payload too large' }

  try {
    if (contentType === 'application/json') {
      if (bytes.byteLength === 0) throw new Error('Empty JSON body')
      const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
      validateJsonValue(value)
    } else {
      new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    }
  } catch {
    return { status: 400, error: 'Malformed request payload' }
  }

  return null
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = contentSecurityPolicy(nonce)

  if (!validateUrl(request)) {
    return applySecurityHeaders(
      NextResponse.json({ error: 'Request URL is too long' }, { status: 414 }),
      csp,
    )
  }

  const retryAfter = checkRateLimit(request)
  if (retryAfter) {
    const response = NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    response.headers.set('Retry-After', String(retryAfter))
    return applySecurityHeaders(response, csp)
  }

  if (!SAFE_METHODS.has(request.method) && !isSameOrigin(request)) {
    return applySecurityHeaders(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      csp,
    )
  }

  if (!SAFE_METHODS.has(request.method) && request.nextUrl.pathname.startsWith('/api/')) {
    const invalidPayload = await validatePayload(request)
    if (invalidPayload) {
      return applySecurityHeaders(
        NextResponse.json({ error: invalidPayload.error }, { status: invalidPayload.status }),
        csp,
      )
    }
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  const response = NextResponse.next({ request: { headers: requestHeaders } })

  return applySecurityHeaders(response, csp)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico).*)'],
}
