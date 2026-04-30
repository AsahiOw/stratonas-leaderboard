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
  name: string
  episode?: string | null
  season?: string | null
  server: string
  status: string
  color: string
  color2: string
  pattern: string
  desc?: string | null
  startDate?: string | null
  endDate?: string | null
}

interface PlayerData {
  id: string
  ign: string
  favouriteStudent?: string | null
}

interface Props {
  initialRaids: RaidData[]
  initialPlayers: PlayerData[]
}

export function LeaderboardApp({ initialRaids, initialPlayers }: Props) {
  const { data: session, status } = useSession()
  const isAdmin = status === 'authenticated' && (session?.user as { role?: string })?.role === 'ADMIN'

  const [tab, setTab] = useState<Tab>('leaderboard')
  const [serverFilter, setServerFilter] = useState<ServerFilter>('all')
  const [showLogin, setShowLogin] = useState(false)
  const [profilePlayerId, setProfilePlayerId] = useState<string | null>(null)
  const [raidEntries, setRaidEntries] = useState<Record<string, TableEntry[]>>({})

  // Fetch entries for all raids on mount
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

  function handlePlayerClick(name: string) {
    const player = initialPlayers.find((p) => p.ign === name)
    if (player) setProfilePlayerId(player.id)
  }

  function matchesServer(raid: RaidData): boolean {
    if (serverFilter === 'all') return true
    return raid.server.toLowerCase() === serverFilter
  }

  const currentRaids  = initialRaids.filter((r) => r.status === 'CURRENT'  && matchesServer(r))
  const previousRaids = initialRaids.filter((r) => r.status === 'PREVIOUS' && matchesServer(r))
  const previousCount = initialRaids.filter((r) => r.status === 'PREVIOUS').length

  // When admin logs in, switch to admin tab
  function handleLogin() {
    setShowLogin(false)
    setTab('admin')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar
        tab={tab}
        setTab={setTab}
        loggedIn={isAdmin}
        onLoginClick={handleLoginClick}
        serverFilter={serverFilter}
        setServerFilter={setServerFilter}
        previousRaidCount={previousCount}
      />

      <div style={{
        maxWidth: tab === 'admin' ? 1100 : 940,
        margin: '0 auto',
        padding: tab === 'admin' ? '24px 20px 60px' : '0 20px 60px',
      }}>

        {/* LEADERBOARD */}
        {tab === 'leaderboard' && (
          <div>
            <div style={{
              textAlign: 'center', padding: '34px 0 26px',
              background: 'radial-gradient(ellipse 70% 260px at 50% 0, rgba(79,142,247,0.07), transparent)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.14em', marginBottom: 8 }}>
                ◈ SEASON 3 · ACTIVE RAIDS
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em' }}>
                Stratonas <span style={{ color: 'var(--accent)' }}>Leaderboard</span>
              </h1>
              <p style={{ color: 'var(--muted2)', fontSize: 14, marginTop: 8 }}>
                {currentRaids.length} active raid{currentRaids.length !== 1 ? 's' : ''} · Showing top 10 per raid
                {serverFilter !== 'all' ? ` · ${serverFilter.toUpperCase()} server` : ''}
              </p>
            </div>
            {currentRaids.length === 0
              ? <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '60px 0', fontSize: 14 }}>No active raids for this server filter.</div>
              : currentRaids.map((r) => (
                <RaidBlock
                  key={r.id}
                  raid={r}
                  entries={raidEntries[r.id] || []}
                  onPlayerClick={handlePlayerClick}
                  capRows={10}
                />
              ))
            }
          </div>
        )}

        {/* PREVIOUS RAIDS */}
        {tab === 'previous' && (
          <div>
            <div style={{ padding: '28px 0 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.14em', marginBottom: 6 }}>◈ ARCHIVED RAIDS</div>
              <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Previous Rankings</h2>
              <p style={{ color: 'var(--muted2)', fontSize: 13, marginTop: 6 }}>
                All past raids and their final standings — click &quot;View Full Rankings&quot; for Top 50
              </p>
            </div>
            {previousRaids.length === 0
              ? <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '60px 0', fontSize: 14 }}>No previous raids for this server filter.</div>
              : previousRaids.map((r) => (
                <RaidBlock
                  key={r.id}
                  raid={r}
                  entries={raidEntries[r.id] || []}
                  onPlayerClick={handlePlayerClick}
                />
              ))
            }
          </div>
        )}

        {/* STATS */}
        {tab === 'stats' && (
          <div style={{ paddingTop: 28 }}>
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.14em', marginBottom: 6 }}>◈ SEASON OVERVIEW</div>
              <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Statistics</h2>
            </div>
            <StatsPage onPlayerClick={(pid) => setProfilePlayerId(pid)} />
          </div>
        )}

        {/* ADMIN */}
        {tab === 'admin' && !isAdmin && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--muted2)', marginBottom: 8 }}>Admin Access Required</div>
            <div style={{ fontSize: 14, marginBottom: 24 }}>Please log in to manage leaderboard data.</div>
            <button
              onClick={() => setShowLogin(true)}
              style={{ background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '11px 24px', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
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
