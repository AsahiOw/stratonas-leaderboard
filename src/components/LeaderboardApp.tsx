'use client'
import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Navbar } from '@/components/Navbar'
import { RaidBlock } from '@/components/RaidBlock'
import { StatsPage } from '@/components/StatsPage'
import { AdminPanel } from '@/components/AdminPanel'
import { PlayerProfile } from '@/components/PlayerProfile'
import { LoginModal } from '@/components/LoginModal'
import type { TableEntry } from '@/components/LeaderboardTable'

type Tab = 'leaderboard' | 'previous' | 'stats' | 'admin'
type ServerFilter = 'all' | 'global' | 'jp'

interface RaidData {
  id: string
  raidBossId: string
  raidBoss: { id: string; name: string; description: string; image?: string | null }
  season: number
  typeId: string
  type: { id: string; name: string }
  serverId: string
  server: { id: string; name: string }
  isActive: boolean
  color: string
  color2: string
  pattern: string
  startDate?: string | null
  endDate?: string | null
}

interface Props {
  initialRaids: RaidData[]
}

export function LeaderboardApp({ initialRaids }: Props) {
  const { data: session, status } = useSession()
  const isAdmin = status === 'authenticated' && (session?.user as { role?: string })?.role === 'ADMIN'

  const [tab, setTab] = useState<Tab>('leaderboard')
  const [serverFilter, setServerFilter] = useState<ServerFilter>('all')
  const [showLogin, setShowLogin] = useState(false)
  const [profilePlayerId, setProfilePlayerId] = useState<string | null>(null)
  const [raidEntries, setRaidEntries] = useState<Record<string, TableEntry[]>>({})

  useEffect(() => {
    initialRaids.forEach((raid) => {
      fetch(`/api/raids/${raid.id}/entries`)
        .then((r) => r.json())
        .then((entries: TableEntry[]) => {
          setRaidEntries((prev) => ({ ...prev, [raid.id]: entries }))
        })
    })
  }, [initialRaids])

  function handleLoginClick() {
    if (isAdmin) {
      signOut({ redirect: false })
      if (tab === 'admin') setTab('leaderboard')
    } else {
      setShowLogin(true)
    }
  }

  function handlePlayerClick(playerId: string) {
    setProfilePlayerId(playerId)
  }

  function matchesServer(raid: RaidData): boolean {
    if (serverFilter === 'all') return true
    if (serverFilter === 'global') return raid.server.name === 'Global'
    if (serverFilter === 'jp') return raid.server.name === 'Japan'
    return true
  }

  const currentRaids = initialRaids.filter((r) => r.isActive && matchesServer(r))
  const previousRaids = initialRaids.filter((r) => !r.isActive && matchesServer(r))
  const previousCount = initialRaids.filter((r) => !r.isActive).length

  function handleLogin() {
    setShowLogin(false)
    setTab('admin')
  }

  const containerMax = tab === 'admin' ? 'max-w-[1100px]' : 'max-w-[940px]'
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
      />

      <div className={`mx-auto w-full ${containerMax} ${containerPad}`}>
        {/* LEADERBOARD */}
        {tab === 'leaderboard' && (
          <div>
            <div
              className="relative overflow-hidden rounded-2xl border border-border mt-5 mb-5 min-h-[180px] sm:min-h-[220px] flex items-end justify-center text-center bg-cover bg-center"
              style={{ backgroundImage: 'url(/assets/images/banner.gif)' }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(13,13,19,0.18),rgba(13,13,19,0.82))]" />
              <div className="relative px-4 pb-3 sm:pb-4">
                <h1 className="text-2xl sm:text-3xl md:text-[34px] font-bold tracking-[-0.03em] leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.75)]">
                  Stratonas <span className="text-accent">Leaderboard</span>
                </h1>
                <p className="text-muted2 text-sm mt-2 px-2 drop-shadow-[0_1px_8px_rgba(0,0,0,0.75)]">
                  {currentRaids.length} active raid{currentRaids.length !== 1 ? 's' : ''}
                  {serverFilter !== 'all' ? ` · ${serverFilter === 'jp' ? 'JP' : 'Global'} server` : ''}
                </p>
              </div>
            </div>
            {currentRaids.length === 0 ? (
              <div className="text-center text-muted py-16 text-sm">No active raids for this server filter.</div>
            ) : (
              currentRaids.map((r) => (
                <RaidBlock
                  key={r.id}
                  raid={r}
                  entries={raidEntries[r.id] || []}
                  onPlayerClick={handlePlayerClick}
                  capRows={10}
                />
              ))
            )}
          </div>
        )}

        {/* PREVIOUS RAIDS */}
        {tab === 'previous' && (
          <div>
            <div className="pt-7 pb-5">
              <div className="text-[11px] font-bold text-muted tracking-[0.14em] mb-1.5">◈ ARCHIVED RAIDS</div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-[-0.02em]">Previous Rankings</h2>
              <p className="text-muted2 text-[13px] mt-1.5">
                All past raids and their final standings — click &quot;View Full Rankings&quot; for Top 50
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
                />
              ))
            )}
          </div>
        )}

        {/* STATS */}
        {tab === 'stats' && (
          <div className="pt-7">
            <div className="mb-5">
              <div className="text-[11px] font-bold text-muted tracking-[0.14em] mb-1.5">◈ SEASON OVERVIEW</div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-[-0.02em]">Statistics</h2>
            </div>
            <StatsPage onPlayerClick={(pid) => setProfilePlayerId(pid)} />
          </div>
        )}

        {/* ADMIN */}
        {tab === 'admin' && !isAdmin && (
          <div className="text-center py-20 text-muted">
            <div className="text-4xl mb-4">🔒</div>
            <div className="text-lg font-semibold text-muted2 mb-2">Admin Access Required</div>
            <div className="text-sm mb-6">Please log in to manage leaderboard data.</div>
            <button
              onClick={() => setShowLogin(true)}
              className="bg-accent rounded-lg px-6 py-2.5 text-white font-bold text-sm hover:bg-accent/90 transition-colors"
            >
              Login as Admin
            </button>
          </div>
        )}
        {tab === 'admin' && isAdmin && <AdminPanel />}
      </div>

      {showLogin && <LoginModal onLogin={handleLogin} onClose={() => setShowLogin(false)} />}
      {profilePlayerId && <PlayerProfile playerId={profilePlayerId} onClose={() => setProfilePlayerId(null)} />}
    </div>
  )
}
