import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, Space_Mono, Oswald } from 'next/font/google'
import './globals.css'
import { SessionProvider } from 'next-auth/react'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font',
  display: 'swap',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--mono',
  display: 'swap',
})

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Stratonas — Guild Leaderboard',
  description: 'Stratonas Guild Leaderboard — Season 3',
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
    <html lang="en" className={`${spaceGrotesk.variable} ${spaceMono.variable} ${oswald.variable}`}>
      <body className="font-sans bg-bg text-text min-h-screen antialiased">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
