import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SessionProvider } from 'next-auth/react'
import { RouteChrome } from '@/components/RouteChrome'
import { BackToTopButton } from '@/components/BackToTopButton'
import { RadioPlayerProvider } from '@/components/radio/RadioPlayerProvider'
import { RadioMiniPlayer } from '@/components/radio/RadioMiniPlayer'
import { PwaRegistration } from '@/components/PwaRegistration'

export const metadata: Metadata = {
  title: 'Stratónas — Guild Leaderboard',
  description: 'Stratónas Guild Leaderboard',
  applicationName: 'Stratónas',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Stratónas',
    statusBarStyle: 'black-translucent',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: [
      { url: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icons/pwa-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#17121f',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans bg-bg text-text min-h-screen antialiased" suppressHydrationWarning>
        <PwaRegistration />
        <SessionProvider>
          <RadioPlayerProvider>
            {children}
            <RadioMiniPlayer />
            <RouteChrome />
            <BackToTopButton />
          </RadioPlayerProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
