import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SessionProvider } from 'next-auth/react'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata: Metadata = {
  title: 'Stratónas — Guild Leaderboard',
  description: 'Stratónas Guild Leaderboard',
  icons: {
    icon: '/assets/icons/ST_logo.png',
    shortcut: '/assets/icons/ST_logo.png',
    apple: '/assets/icons/ST_logo.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans bg-bg text-text min-h-screen antialiased" suppressHydrationWarning>
        <SessionProvider>
          {children}
          <SiteFooter />
        </SessionProvider>
      </body>
    </html>
  )
}
