import Link from 'next/link'
import type { ReactNode } from 'react'

interface PublicHeaderProps {
  actions?: ReactNode
}

export function PublicHeader({ actions }: PublicHeaderProps) {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-[rgba(13,13,19,0.94)] backdrop-blur-md">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 rounded-md text-text no-underline transition-colors hover:text-accent"
          aria-label="Go to leaderboard home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/icons/icon.gif"
            alt=""
            className="h-8 w-8 rounded-full border border-border object-cover"
          />
          <span className="text-lg font-bold tracking-tight">Stratónas</span>
        </Link>
        {actions && (
          <div className="flex min-w-0 items-center justify-end gap-2">
            {actions}
          </div>
        )}
      </div>
    </nav>
  )
}
