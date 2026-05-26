'use client'

import Link from 'next/link'
import type { CSSProperties, MouseEvent, ReactNode } from 'react'

interface Props {
  href: string
  returnTab: string
  children: ReactNode
  className?: string
  style?: CSSProperties
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
}

function withReturnParam(href: string) {
  const separator = href.includes('?') ? '&' : '?'
  return `${href}${separator}return=1`
}

export function ReturnLocationLink({ href, returnTab, children, className, style, onClick }: Props) {
  return (
    <Link
      href={withReturnParam(href)}
      className={className}
      style={style}
      onClick={(event) => {
        try {
          window.sessionStorage.setItem(
            'stratonas:return-location',
            JSON.stringify({ tab: returnTab, scrollY: window.scrollY }),
          )
        } catch {
          // Ignore storage failures; the destination remains navigable.
        }
        onClick?.(event)
      }}
    >
      {children}
    </Link>
  )
}
