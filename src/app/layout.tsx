import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SessionProvider } from 'next-auth/react'

export const metadata: Metadata = {
  title: 'Stratonas — Guild Leaderboard',
  description: 'Stratonas Guild Leaderboard',
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
      <body className="font-sans bg-bg text-text min-h-screen antialiased">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
