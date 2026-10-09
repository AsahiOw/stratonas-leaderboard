'use client'

import { usePathname } from 'next/navigation'
import { Chatbot } from '@/components/Chatbot'
import { GreetingToast } from '@/components/GreetingToast'
import { SiteFooter } from '@/components/SiteFooter'

export function RouteChrome() {
  const pathname = usePathname()

  if (pathname === '/login' || pathname === '/radio' || pathname === '/playground') return null
  if (pathname === '/3D') return <SiteFooter />

  return (
    <>
      <SiteFooter />
      <Chatbot />
      <GreetingToast />
    </>
  )
}
