import type { Metadata } from 'next'
import { Space_Grotesk, Space_Mono } from 'next/font/google'
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

export const metadata: Metadata = {
  title: 'Stratonas — Guild Leaderboard',
  description: 'Stratonas Guild Leaderboard — Season 3',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${spaceMono.variable}`}>
      <body style={{ fontFamily: 'var(--font), sans-serif' }}>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
