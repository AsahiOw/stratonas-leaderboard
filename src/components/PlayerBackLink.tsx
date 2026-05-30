'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export function ReturnBackLink({ defaultLabel = 'Back to leaderboard' }: { defaultLabel?: string }) {
  const searchParams = useSearchParams()
  const hasReturnLocation = searchParams.get('return') === '1'

  return (
    <Link href="/" className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted2 transition-colors hover:text-text">
      {hasReturnLocation ? 'Back to previous screen' : defaultLabel}
    </Link>
  )
}

export function PlayerBackLink() {
  return <ReturnBackLink />
}
