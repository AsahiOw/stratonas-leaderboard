'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { RaidBlock } from '@/components/RaidBlock'
import { StatsPage } from '@/components/StatsPage'
import { CommunityPage } from '@/components/CommunityPage'
import { AdminPanel } from '@/components/AdminPanel'
import { PlayerProfile } from '@/components/PlayerProfile'
import { BirthdaySection } from '@/components/BirthdaySection'
import { HomeIntro } from '@/components/HomeIntro'
import { FutureRecruitmentSection, type FutureRecruitmentSchedule } from '@/components/FutureRecruitmentSection'
import { loginAssetSources } from '@/lib/login-sprites'
import type { BirthdayStudent } from '@/components/BirthdayTicket'
import type { TableEntry } from '@/components/LeaderboardTable'

type Tab = 'leaderboard' | 'previous' | 'stats' | 'community' | 'admin'
type ServerFilter = 'all' | 'global' | 'jp'
type ReturnLocation = { tab: Tab; scrollY: number }
const INTRO_OPEN_KEY = 'stratonas:intro-open'
const LEGACY_INTRO_DISMISSED_KEY = 'stratonas:intro-dismissed'

interface RaidData {
  id: string
  raidBossId: string
  raidBoss: { id: string; name: string; description: string; image?: string | null }
  season: number
  typeId: string
  type: { id: string; name: string }
  serverId: string
  server: { id: string; name: string }
  terrainId: string
  terrain: { id: string; name: string }
  isActive: boolean
  color: string
  color2: string
  pattern: string
  startDate?: string | null
  endDate?: string | null
}

interface Props {
  initialRaids: RaidData[]
  initialRaidEntries?: Record<string, TableEntry[]>
  futureRecruitment?: FutureRecruitmentSchedule | null
  initialBirthdayData?: {
    birthdayKey: string
    nextRefreshAt: string
    students: BirthdayStudent[]
  } | null
  initialUpcomingBirthdayData?: {
    birthdayKey: string
    nextRefreshAt: string
    maxDays: number
    students: BirthdayStudent[]
  } | null
}

export function LeaderboardApp({
  initialRaids,
  initialRaidEntries = {},
  futureRecruitment = null,
  initialBirthdayData = null,
  initialUpcomingBirthdayData = null,
}: Props) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const isAdmin = status === 'authenticated' && (session?.user as { role?: string })?.role === 'ADMIN'

  const [tab, setTab] = useState<Tab>('leaderboard')
  const [serverFilter, setServerFilter] = useState<ServerFilter>('all')
  const [showIntro, setShowIntro] = useState(false)
  const [profilePlayerId, setProfilePlayerId] = useState<string | null>(null)
  const [adminFullWidth, setAdminFullWidth] = useState(false)
  const [pendingReturnScroll, setPendingReturnScroll] = useState<number | null>(null)
  const [raidEntries, setRaidEntries] = useState<Record<string, TableEntry[]>>(initialRaidEntries)
  const [visitedTabs, setVisitedTabs] = useState<Record<Tab, boolean>>({
    leaderboard: true,
    previous: false,
    stats: false,
    community: false,
    admin: false,
  })

  const loadRaidEntries = useCallback((raidIds: string[]) => {
    const missingRaidIds = raidIds.filter((id) => !raidEntries[id])
    if (missingRaidIds.length === 0) return

    missingRaidIds.forEach((raidId) => {
      fetch(`/api/raids/${raidId}/entries`)
        .then((r) => r.json())
        .then((entries: TableEntry[]) => {
          setRaidEntries((prev) => ({ ...prev, [raidId]: entries }))
        })
        .catch(() => undefined)
    })
  }, [raidEntries])

  useEffect(() => {
    window.localStorage.removeItem(LEGACY_INTRO_DISMISSED_KEY)

    const storedIntroOpen = window.localStorage.getItem(INTRO_OPEN_KEY)
    const nextIntroOpen = storedIntroOpen === null ? true : storedIntroOpen === 'true'

    setShowIntro(nextIntroOpen)
    if (storedIntroOpen === null) window.localStorage.setItem(INTRO_OPEN_KEY, 'true')
  }, [])

  useEffect(() => {
    loginAssetSources.forEach((source) => {
      const image = new Image()
      image.src = source
    })
  }, [])

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem('stratonas:return-location')
      if (!raw) return

      window.sessionStorage.removeItem('stratonas:return-location')
      const saved = JSON.parse(raw) as Partial<ReturnLocation>
      const tabs: Tab[] = ['leaderboard', 'previous', 'stats', 'community', 'admin']
      if (!saved.tab || !tabs.includes(saved.tab) || saved.tab === 'admin') return

      setTab(saved.tab)
      setVisitedTabs((prev) => ({ ...prev, [saved.tab as Tab]: true }))
      setPendingReturnScroll(typeof saved.scrollY === 'number' ? saved.scrollY : 0)
    } catch {
      window.sessionStorage.removeItem('stratonas:return-location')
    }
  }, [])

  useEffect(() => {
    if (pendingReturnScroll === null) return

    const scrollToSavedPlace = () => window.scrollTo({ top: pendingReturnScroll, behavior: 'auto' })
    const frame = window.requestAnimationFrame(scrollToSavedPlace)
    const timers = [120, 400, 900, 1500].map((delay) => window.setTimeout(scrollToSavedPlace, delay))
    const done = window.setTimeout(() => setPendingReturnScroll(null), 1700)

    return () => {
      window.cancelAnimationFrame(frame)
      timers.forEach((timer) => window.clearTimeout(timer))
      window.clearTimeout(done)
    }
  }, [pendingReturnScroll])

  useEffect(() => {
    setVisitedTabs((prev) => prev[tab] ? prev : { ...prev, [tab]: true })
  }, [tab])

  function handleLoginClick() {
    if (isAdmin) {
      signOut({ redirect: false })
      if (tab === 'admin') setTab('leaderboard')
    } else {
      router.push('/login')
    }
  }

  function handlePlayerClick(playerId: string) {
    setProfilePlayerId(playerId)
  }

  const matchesServer = useCallback((raid: RaidData): boolean => {
    if (serverFilter === 'all') return true
    if (serverFilter === 'global') return raid.server.name === 'Global'
    if (serverFilter === 'jp') return raid.server.name === 'Japan'
    return true
  }, [serverFilter])

  const latestRaids = useMemo(
    () => initialRaids.filter((r) => r.isActive && matchesServer(r)),
    [initialRaids, matchesServer]
  )
  const previousRaids = useMemo(
    () => initialRaids.filter((r) => !r.isActive && matchesServer(r)),
    [initialRaids, matchesServer]
  )
  const previousCount = useMemo(
    () => initialRaids.filter((r) => !r.isActive).length,
    [initialRaids]
  )

  useEffect(() => {
    loadRaidEntries(latestRaids.map((raid) => raid.id))
  }, [latestRaids, loadRaidEntries])

  useEffect(() => {
    if (visitedTabs.previous) loadRaidEntries(previousRaids.map((raid) => raid.id))
  }, [previousRaids, visitedTabs.previous, loadRaidEntries])

  function scrollToTop() {
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  }

  function setIntroOpen(open: boolean) {
    setShowIntro(open)
    window.localStorage.setItem(INTRO_OPEN_KEY, open ? 'true' : 'false')
  }

  function handleIntroToggle() {
    if (tab !== 'leaderboard') {
      setTab('leaderboard')
      setIntroOpen(true)
      scrollToTop()
      return
    }

    setShowIntro((current) => {
      const next = !current
      window.localStorage.setItem(INTRO_OPEN_KEY, next ? 'true' : 'false')
      if (next) scrollToTop()
      return next
    })
  }

  const containerMax = tab === 'admin' && adminFullWidth ? 'max-w-none' : tab === 'admin' || tab === 'community' ? 'max-w-[1100px]' : 'max-w-[940px]'
  const containerPad = tab === 'admin' ? 'pt-6 pb-16 px-4 sm:px-5' : 'pb-16 px-4 sm:px-5'

  return (
    <div className="min-h-screen bg-bg">
      <Navbar
        tab={tab}
        setTab={setTab}
        loggedIn={isAdmin}
        onLoginClick={handleLoginClick}
        serverFilter={serverFilter}
        setServerFilter={setServerFilter}
        previousRaidCount={previousCount}
        introOpen={tab === 'leaderboard' && showIntro}
        onIntroToggle={handleIntroToggle}
        adminFullWidth={adminFullWidth}
        onToggleAdminFullWidth={() => setAdminFullWidth((fullWidth) => !fullWidth)}
      />

      <div className={`mx-auto w-full ${containerMax} ${containerPad}`}>
        {/* LEADERBOARD */}
        {tab === 'leaderboard' && (
          <div key={`leaderboard-${serverFilter}`} className="view-transition">
            <HomeIntro open={showIntro} onClose={() => setIntroOpen(false)} />
            <div
              className="relative overflow-hidden rounded-2xl border border-border mt-5 mb-5 min-h-[180px] sm:min-h-[220px] flex items-end justify-center text-center bg-cover bg-center"
              style={{ backgroundImage: 'url(/assets/images/banner.gif)' }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(13,13,19,0.18),rgba(13,13,19,0.82))]" />
              <div className="relative px-4 pb-3 sm:pb-4">
                <h1 className="text-2xl sm:text-3xl md:text-[34px] font-bold tracking-[-0.03em] leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.75)]">
                  Stratónas <span className="text-accent">Leaderboard</span>
                </h1>
                <p className="text-muted2 text-sm mt-2 px-2 drop-shadow-[0_1px_8px_rgba(0,0,0,0.75)]">
                  Latest raid updates
                  {serverFilter !== 'all' ? ` for the ${serverFilter === 'jp' ? 'JP' : 'Global'} server` : ' across all servers'}
                </p>
              </div>
            </div>
            <FutureRecruitmentSection schedule={futureRecruitment} />
            {latestRaids.length === 0 ? (
              <div className="text-center text-muted py-16 text-sm">No completed raid results for this server filter.</div>
            ) : (
              latestRaids.map((r) => (
                <RaidBlock
                  key={r.id}
                  raid={r}
                  entries={raidEntries[r.id] || []}
                  onPlayerClick={handlePlayerClick}
                  capRows={10}
                  returnTab="leaderboard"
                />
              ))
            )}
            <BirthdaySection initialData={initialBirthdayData} initialUpcomingData={initialUpcomingBirthdayData} />
          </div>
        )}

        {/* PREVIOUS RAIDS */}
        {tab === 'previous' && (
          <div key={`previous-${serverFilter}`} className="view-transition">
            <div className="pt-7 pb-5">
              <div className="text-[11px] font-bold text-muted tracking-[0.14em] mb-1.5">◈ ARCHIVED RAIDS</div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-[-0.02em]">Previous Rankings</h2>
              <p className="text-muted2 text-[13px] mt-1.5">
                All past raids and their final standings — click &quot;View Card Rankings&quot; for Top 50
              </p>
            </div>
            {previousRaids.length === 0 ? (
              <div className="text-center text-muted py-16 text-sm">No previous raids for this server filter.</div>
            ) : (
              previousRaids.map((r) => (
                <RaidBlock
                  key={r.id}
                  raid={r}
                  entries={raidEntries[r.id] || []}
                  onPlayerClick={handlePlayerClick}
                  capRows={10}
                  defaultOpen={false}
                  returnTab="previous"
                />
              ))
            )}
          </div>
        )}

        {/* STATS */}
        {visitedTabs.stats && (
          <div className={`pt-7 ${tab === 'stats' ? 'view-transition' : 'hidden'}`}>
            <div className="mb-5">
              <div className="text-[11px] font-bold text-muted tracking-[0.14em] mb-1.5">◈ SEASON OVERVIEW</div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-[-0.02em]">Statistics</h2>
            </div>
            <StatsPage onPlayerClick={(pid) => setProfilePlayerId(pid)} />
          </div>
        )}

        {/* COMMUNITY */}
        {visitedTabs.community && (
          <div className={`pt-7 ${tab === 'community' ? 'view-transition' : 'hidden'}`}>
            <CommunityPage onPlayerClick={handlePlayerClick} />
          </div>
        )}

        {/* ADMIN */}
        {tab === 'admin' && !isAdmin && (
          <div className="view-transition text-center py-20 text-muted">
            <div className="text-4xl mb-4">🔒</div>
            <div className="text-lg font-semibold text-muted2 mb-2">Admin Access Required</div>
            <div className="text-sm mb-6">Please log in to manage leaderboard data.</div>
            <button
              onClick={() => router.push('/login')}
              className="bg-accent rounded-lg px-6 py-2.5 text-white font-bold text-sm hover:bg-accent/90 transition-colors"
            >
              Login as Admin
            </button>
          </div>
        )}
        {visitedTabs.admin && isAdmin && (
          <div className={tab === 'admin' ? 'view-transition' : 'hidden'}>
            <AdminPanel active={tab === 'admin'} />
          </div>
        )}
      </div>

      {profilePlayerId && <PlayerProfile playerId={profilePlayerId} returnTab={tab} onClose={() => setProfilePlayerId(null)} />}
    </div>
  )
}
