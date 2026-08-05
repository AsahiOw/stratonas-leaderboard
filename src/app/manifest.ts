import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Stratónas — Guild Leaderboard',
    short_name: 'Stratónas',
    description: 'Stratónas Guild Leaderboard',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#17121f',
    theme_color: '#17121f',
    orientation: 'any',
    icons: [
      {
        src: '/icons/pwa-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/pwa-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/pwa-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
