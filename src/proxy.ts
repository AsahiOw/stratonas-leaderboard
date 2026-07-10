import { NextRequest, NextResponse } from 'next/server'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const isProduction = process.env.NODE_ENV === 'production'

function normalizeCsp(directives: string[]) {
  return directives.join('; ').replace(/\s{2,}/g, ' ').trim()
}

function contentSecurityPolicy() {
  const devConnectSources = isProduction
    ? []
    : ['http://localhost:*', 'http://127.0.0.1:*', 'ws://localhost:*', 'ws://127.0.0.1:*']
  const connectSources = ["'self'", ...devConnectSources].join(' ')

  return normalizeCsp([
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
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
  if (!origin) return true

  const host = request.headers.get('host')
  if (!host) return false

  try {
    return new URL(origin).host === host
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

export function proxy(request: NextRequest) {
  const csp = contentSecurityPolicy()

  if (!SAFE_METHODS.has(request.method) && !isSameOrigin(request)) {
    return applySecurityHeaders(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      csp,
    )
  }

  const response = NextResponse.next()

  return applySecurityHeaders(response, csp)
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
