/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker builds run on Linux and use the minimal standalone server. Native
  // Windows builds use the regular `.next` output so Next's Windows file
  // tracing cannot copy mounted BAAD/chibi storage into a multi-gigabyte
  // standalone directory; `npm start` remains the supported native command.
  output: process.platform === 'win32' ? undefined : 'standalone',
  serverExternalPackages: ['@duckdb/node-api'],
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.1.*'],
  images: {
    qualities: [75, 90],
    remotePatterns: [
      { protocol: 'https', hostname: 'schaledb.com', port: '', pathname: '/images/student/**', search: '' },
    ],
    localPatterns: [
      { pathname: '/assets/**' },
      { pathname: '/api/image-proxy' },
      { pathname: '/api/memorial-poster' },
      { pathname: '/api/radio/thumbnail/**' },
    ],
  },
  experimental: {
    proxyClientMaxBodySize: '250mb',
  },
  outputFileTracingExcludes: {
    '/*': [
      './Development_data/**/*',
      './Production_data/**/*',
    ],
    // The standalone server has a shared `next-server` trace in addition to
    // per-route traces. Keep mounted source/tool storage out of that trace;
    // the worker and app receive it through Compose volumes at runtime.
    'next-server': [
      './Development_data/**/*',
      './Production_data/**/*',
    ],
  },
  async headers() {
    const securityHeaders = [
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'off',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=()',
      },
      {
        key: 'Cross-Origin-Opener-Policy',
        value: 'same-origin',
      },
      {
        key: 'Cross-Origin-Resource-Policy',
        value: 'same-origin',
      },
      {
        key: 'X-XSS-Protection',
        value: '0',
      },
    ]

    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      })
    }

    return [
      {
        source: '/api/admin/:path*',
        headers: [
          ...securityHeaders,
          {
            key: 'Cache-Control',
            value: 'private, no-store, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/api/auth/:path*',
        headers: [
          ...securityHeaders,
          {
            key: 'Cache-Control',
            value: 'private, no-store, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/assets/:path((?!chibi/).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=2592000',
          },
        ],
      },
      {
        source: '/font/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
