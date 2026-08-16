'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { PlanaRaidBrowser } from '@/components/PlanaRaidBrowser'

type Tab = 'leaderboard' | 'previous' | 'raid' | 'calendar' | 'stats' | 'community' | 'other' | 'custom-card' | 'news' | 'radio' | 'admin'
type ServerFilter = 'all' | 'global' | 'jp'

const routeByTab: Record<Tab, string> = {
  leaderboard: '/',
  previous: '/history',
  raid: '/raiddata',
  calendar: '/calendar',
  stats: '/statistic',
  community: '/community',
  other: '/other',
  'custom-card': '/custom-card',
  news: '/news',
  radio: '/radio',
  admin: '/admin',
}

export function RaidDataPage({
  initialRaidId,
  previousRaidCount,
}: {
  initialRaidId?: string
  previousRaidCount: number
}) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [serverFilter, setServerFilter] = useState<ServerFilter>('global')
  const isAdmin = status === 'authenticated' && (session?.user as { role?: string })?.role === 'ADMIN'

  function handleTabChange(tab: Tab) {
    router.push(routeByTab[tab])
  }

  function handleLoginClick() {
    if (isAdmin) void signOut({ redirect: false })
    else router.push('/login')
  }

  return (
    <div className="min-h-screen bg-bg">
      {!initialRaidId && (
        <Navbar
          tab="raid"
          setTab={handleTabChange}
          loggedIn={isAdmin}
          onLoginClick={handleLoginClick}
          serverFilter={serverFilter}
          setServerFilter={setServerFilter}
          previousRaidCount={previousRaidCount}
        />
      )}
      <div className="mx-auto w-full max-w-[940px] pb-16 px-4 sm:px-5">
        <PlanaRaidBrowser initialRaidId={initialRaidId} />
      </div>
    </div>
  )
}
