'use client'
import { useState, useEffect, useCallback } from 'react'
import { ServerBadge } from '@/components/ui/ServerBadge'
import { StModal } from '@/components/ui/StModal'
import { StField, inputClass } from '@/components/ui/StField'
import { Toast } from '@/components/ui/Toast'
import { fmtDate, proxyImage } from '@/lib/utils'

const STUDENTS = ['Hoshino','Shiroko','Yuuka','Aris','Natsu','Hibiki','Kayoko','Neru','Haruna','Mutsuki','Serika','Nonomi','Karin','Haruka','Izumi','Ui','Mika','Sora','Toki','Ako']

interface Player {
  id: string; ign: string; username: string; favouriteStudent?: string | null
  joinedDate?: string | null; club?: string | null; clubID?: string | null
  userID?: string | null; isGuildMember: boolean
}

interface RaidBoss {
  id: string; name: string; description: string; image?: string | null
  color: string; color2: string; pattern: string
}

interface RaidType {
  id: string; name: string
}

interface RaidServer {
  id: string; name: string
}

interface Raid {
  id: string
  raidBossId: string
  raidBoss: RaidBoss
  season: number
  typeId: string
  type: RaidType
  serverId: string
  server: RaidServer
  isActive: boolean
  color: string
  color2: string
  pattern: string
  startDate?: string | null
  endDate?: string | null
}

interface Entry {
  id: string; score: number
  createdAt: string; player: Player; raid: Raid
}

type Section = 'dashboard' | 'players' | 'raids' | 'bosses' | 'entries' | 'settings'
type ListSection = 'activity' | 'players' | 'raids' | 'bosses' | 'entries'

const navItems: { id: Section; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'players',   label: 'Players',   icon: '◎' },
  { id: 'raids',     label: 'Raids',     icon: '⬡' },
  { id: 'bosses',    label: 'Bosses',    icon: '◉' },
  { id: 'entries',   label: 'Entries',   icon: '⊞' },
  { id: 'settings',  label: 'Settings',  icon: '⊛' },
]

const RAID_TYPES   = ['Total Assault', 'Grand Assault']
const RAID_SERVERS = ['Global', 'Japan']

const editBtnClass =
  'bg-accent/[0.12] border border-accent/30 rounded-md px-2.5 py-1 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors'
const delBtnClass =
  'bg-red/10 border border-red/25 rounded-md px-2.5 py-1 text-red text-xs hover:bg-red/20 transition-colors'
const submitBtnClass =
  'w-full bg-accent rounded-lg py-3 text-white font-bold text-sm cursor-pointer mt-1.5 hover:bg-accent/90 transition-colors'
const addBtnClass =
  'bg-accent rounded-lg px-4 py-2 text-white font-semibold text-[13px] cursor-pointer hover:bg-accent/90 transition-colors whitespace-nowrap'
const searchInputClass =
  'w-full bg-bg border border-border rounded-lg px-3.5 py-2.5 text-sm text-text outline-none transition-colors placeholder:text-muted focus:border-accent/60'
const showMoreBtnClass =
  'w-full sm:w-auto bg-card2 border border-border rounded-lg px-4 py-2 text-sm font-semibold text-muted2 hover:text-text hover:border-border2 transition-colors'
const INITIAL_VISIBLE_ROWS = 10
const SHOW_MORE_ROWS = 50

export function AdminPanel() {
  const [sec, setSec] = useState<Section>('dashboard')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [players, setPlayers]   = useState<Player[]>([])
  const [raids, setRaids]       = useState<Raid[]>([])
  const [bosses, setBosses]     = useState<RaidBoss[]>([])
  const [raidTypes, setRaidTypes]     = useState<RaidType[]>([])
  const [raidServers, setRaidServers] = useState<RaidServer[]>([])
  const [entries, setEntries]   = useState<Entry[]>([])
  const [modal, setModal]       = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<Player | Raid | Entry | RaidBoss | null>(null)
  const [toast, setToast]       = useState<string | null>(null)
  const [search, setSearch] = useState<Record<ListSection, string>>({
    activity: '',
    players: '',
    raids: '',
    bosses: '',
    entries: '',
  })
  const [visibleRows, setVisibleRows] = useState<Record<ListSection, number>>({
    activity: INITIAL_VISIBLE_ROWS,
    players: INITIAL_VISIBLE_ROWS,
    raids: INITIAL_VISIBLE_ROWS,
    bosses: INITIAL_VISIBLE_ROWS,
    entries: INITIAL_VISIBLE_ROWS,
  })

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const loadPlayers = useCallback(() => fetch('/api/admin/players').then(r => r.json()).then(setPlayers), [])
  const loadRaids   = useCallback(() => fetch('/api/raids').then(r => r.json()).then(setRaids), [])
  const loadBosses  = useCallback(() => fetch('/api/raid-bosses').then(r => r.json()).then(setBosses), [])
  const loadEntries = useCallback(() => fetch('/api/admin/entries').then(r => r.json()).then(setEntries), [])

  const loadLookups = useCallback(() => {
    Promise.all([
      fetch('/api/raid-bosses').then(r => r.json()),
      fetch('/api/raids').then(r => r.json()),
    ]).then(([b, raids]) => {
      setBosses(b)
      if (raids.length > 0) {
        setRaidTypes([raids[0].type, ...raids
          .map((r: Raid) => r.type)
          .filter((t: RaidType, i: number, arr: RaidType[]) => arr.findIndex(x => x.id === t.id) === i)
          .slice(1)])
        setRaidServers([raids[0].server, ...raids
          .map((r: Raid) => r.server)
          .filter((s: RaidServer, i: number, arr: RaidServer[]) => arr.findIndex(x => x.id === s.id) === i)
          .slice(1)])
      }
    })
  }, [])

  useEffect(() => {
    loadPlayers(); loadRaids(); loadBosses(); loadEntries(); loadLookups()
  }, [loadPlayers, loadRaids, loadBosses, loadEntries, loadLookups])

  // Lock body scroll while the mobile sidebar drawer is open.
  useEffect(() => {
    if (!drawerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [drawerOpen])

  // ── Player form ────────────────────────────────────────────────────────────
  const emptyP = { ign: '', username: '', favouriteStudent: 'Hoshino', joinedDate: '', club: 'Guest', clubID: 'GUEST', userID: '' }
  const [pForm, setPForm] = useState(emptyP)
  const [isGuest, setIsGuest] = useState(true)

  function openAddPlayer() { setPForm(emptyP); setIsGuest(true); setEditTarget(null); setModal('player') }
  function openEditPlayer(p: Player) {
    const guest = !p.isGuildMember
    setPForm({ ign: p.ign, username: p.username, favouriteStudent: p.favouriteStudent || 'Hoshino', joinedDate: p.joinedDate ? p.joinedDate.split('T')[0] : '', club: p.club || 'Guest', clubID: p.clubID || (guest ? 'GUEST' : ''), userID: p.userID || '' })
    setIsGuest(guest); setEditTarget(p); setModal('player')
  }
  async function deletePlayer(id: string) {
    await fetch(`/api/admin/players/${id}`, { method: 'DELETE' }); loadPlayers(); showToast('Player deleted.')
  }
  async function savePlayer(e: React.FormEvent) {
    e.preventDefault()
    const payload = isGuest
      ? { ...pForm, club: 'Guest', clubID: 'GUEST', isGuildMember: false }
      : { ...pForm, isGuildMember: true }
    if (editTarget) {
      await fetch(`/api/admin/players/${(editTarget as Player).id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      showToast('Player updated.')
    } else {
      await fetch('/api/admin/players', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      showToast('Player added.')
    }
    setModal(null); loadPlayers()
  }

  // ── Raid Boss form ─────────────────────────────────────────────────────────
  const emptyB = { name: '', description: '', image: '', color: '#4f8ef7', color2: '#7c3aed', pattern: 'hex' }
  const [bForm, setBForm] = useState(emptyB)

  function openAddBoss() { setBForm(emptyB); setEditTarget(null); setModal('boss') }
  function openEditBoss(b: RaidBoss) {
    setBForm({
      name: b.name,
      description: b.description,
      image: b.image || '',
      color: b.color || '#4f8ef7',
      color2: b.color2 || '#7c3aed',
      pattern: b.pattern || 'hex',
    })
    setEditTarget(b); setModal('boss')
  }
  async function deleteBoss(id: string) {
    await fetch(`/api/admin/raid-bosses/${id}`, { method: 'DELETE' }); loadBosses(); showToast('Boss deleted.')
  }
  async function saveBoss(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      name: bForm.name,
      description: bForm.description,
      image: bForm.image || null,
      color: bForm.color,
      color2: bForm.color2,
      pattern: bForm.pattern,
    }
    if (editTarget) {
      await fetch(`/api/admin/raid-bosses/${(editTarget as RaidBoss).id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      showToast('Boss updated.')
    } else {
      await fetch('/api/admin/raid-bosses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      showToast('Boss added.')
    }
    setModal(null); loadBosses(); loadRaids()
  }

  // ── Raid form ──────────────────────────────────────────────────────────────
  const emptyR = {
    raidBossId: '', season: '3',
    typeId: '', serverId: '',
    startDate: '', endDate: '',
  }
  const [rForm, setRForm] = useState(emptyR)

  function openAddRaid() {
    setRForm({ ...emptyR, raidBossId: bosses[0]?.id || '', typeId: raidTypes[0]?.id || '', serverId: raidServers[0]?.id || '' })
    setEditTarget(null); setModal('raid')
  }
  function openEditRaid(r: Raid) {
    setRForm({
      raidBossId: r.raidBossId,
      season: String(r.season),
      typeId: r.typeId,
      serverId: r.serverId,
      startDate: r.startDate ? r.startDate.split('T')[0] : '',
      endDate: r.endDate ? r.endDate.split('T')[0] : '',
    })
    setEditTarget(r); setModal('raid')
  }
  async function deleteRaid(id: string) {
    await fetch(`/api/admin/raids/${id}`, { method: 'DELETE' }); loadRaids(); showToast('Raid deleted.')
  }
  async function saveRaid(e: React.FormEvent) {
    e.preventDefault()
    if (editTarget) {
      await fetch(`/api/admin/raids/${(editTarget as Raid).id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rForm) })
      showToast('Raid updated.')
    } else {
      await fetch('/api/admin/raids', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rForm) })
      showToast('Raid added.')
    }
    setModal(null); loadRaids()
  }

  // ── Entry form ─────────────────────────────────────────────────────────────
  const emptyE = { playerId: '', raidId: '', score: '' }
  const [eForm, setEForm] = useState(emptyE)

  function openAddEntry() { setEForm({ ...emptyE, raidId: raids[0]?.id || '', playerId: players[0]?.id || '' }); setEditTarget(null); setModal('entry') }
  function openEditEntry(en: Entry) {
    setEForm({ playerId: en.player.id, raidId: en.raid.id, score: String(en.score) })
    setEditTarget(en); setModal('entry')
  }
  async function deleteEntry(id: string) {
    await fetch(`/api/admin/entries/${id}`, { method: 'DELETE' }); loadEntries(); showToast('Entry deleted.')
  }
  async function saveEntry(e: React.FormEvent) {
    e.preventDefault()
    if (editTarget) {
      await fetch(`/api/admin/entries/${(editTarget as Entry).id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(eForm) })
      showToast('Entry updated.')
    } else {
      await fetch('/api/admin/entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(eForm) })
      showToast('Entry added.')
    }
    setModal(null); loadEntries()
  }

  const activeRaidCount = raids.filter(r => r.isActive).length
  const currentNav = navItems.find((n) => n.id === sec)
  const normalizedSearch = {
    activity: search.activity.trim().toLowerCase(),
    players: search.players.trim().toLowerCase(),
    raids: search.raids.trim().toLowerCase(),
    bosses: search.bosses.trim().toLowerCase(),
    entries: search.entries.trim().toLowerCase(),
  }

  function searchable(values: Array<string | number | boolean | null | undefined>, query: string) {
    if (!query) return true
    return values
      .filter((value) => value !== null && value !== undefined)
      .some((value) => String(value).toLowerCase().includes(query))
  }

  const filteredPlayers = players.filter((p) => searchable([
    p.ign, p.username, p.favouriteStudent, p.club, p.clubID, p.userID, p.isGuildMember ? 'guild' : 'guest',
  ], normalizedSearch.players))
  const filteredRaids = raids.filter((r) => searchable([
    r.raidBoss.name, r.raidBoss.description, r.season, r.type.name, r.server.name,
    r.pattern, r.startDate, r.endDate,
  ], normalizedSearch.raids))
  const filteredBosses = bosses.filter((b) => searchable([
    b.name, b.description, b.image, b.color, b.color2, b.pattern,
  ], normalizedSearch.bosses))
  const filteredEntries = entries.filter((e) => searchable([
    e.player.ign, e.player.username, e.player.club, e.player.clubID, e.player.userID,
    e.raid.raidBoss.name, e.raid.season, e.raid.type.name, e.raid.server.name,
    e.score, e.createdAt,
  ], normalizedSearch.entries))
  const filteredActivity = entries.filter((e) => searchable([
    e.player.ign, e.player.username, e.raid.raidBoss.name, e.raid.season, e.raid.server.name,
    e.score, e.createdAt,
  ], normalizedSearch.activity))

  const visibleActivity = filteredActivity.slice(0, visibleRows.activity)
  const visiblePlayers = filteredPlayers.slice(0, visibleRows.players)
  const visibleRaids = filteredRaids.slice(0, visibleRows.raids)
  const visibleBosses = filteredBosses.slice(0, visibleRows.bosses)
  const visibleEntries = filteredEntries.slice(0, visibleRows.entries)

  function selectSection(s: Section) {
    setSec(s)
    setDrawerOpen(false)
  }

  function updateSearch(section: ListSection, value: string) {
    setSearch((prev) => ({ ...prev, [section]: value }))
    setVisibleRows((prev) => ({ ...prev, [section]: INITIAL_VISIBLE_ROWS }))
  }

  function showMore(section: ListSection) {
    setVisibleRows((prev) => ({ ...prev, [section]: prev[section] + SHOW_MORE_ROWS }))
  }

  function renderListControls(section: ListSection, total: number, filtered: number, visible: number, placeholder: string) {
    return (
      <>
        <div className="mb-3">
          <input
            className={searchInputClass}
            type="search"
            value={search[section]}
            onChange={(e) => updateSearch(section, e.target.value)}
            placeholder={placeholder}
            aria-label={`Search ${section}`}
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 text-[12px] text-muted">
          <span>
            Showing {Math.min(visible, filtered)} of {filtered}
            {filtered !== total ? ` filtered from ${total}` : ''}
          </span>
        </div>
      </>
    )
  }

  function renderShowMore(section: ListSection, filtered: number, visible: number) {
    if (visible >= filtered) return null
    return (
      <div className="flex justify-center mt-3">
        <button type="button" onClick={() => showMore(section)} className={showMoreBtnClass}>
          Show more
        </button>
      </div>
    )
  }

  return (
    <div className="relative bg-surface rounded-2xl border border-border overflow-hidden md:flex md:min-h-[520px]">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-bg">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open admin menu"
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-border bg-card text-muted2 hover:text-text hover:border-border2 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="7"  x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
        <div className="flex items-center gap-2 text-sm text-muted2">
          <span className="text-base">{currentNav?.icon}</span>
          <span className="font-semibold text-text">{currentNav?.label}</span>
        </div>
        <div className="text-[10px] text-muted tracking-[0.1em] font-semibold">ADMIN</div>
      </div>

      {/* Mobile drawer backdrop */}
      {drawerOpen && (
        <button
          aria-label="Close menu"
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 md:w-48 md:shrink-0 bg-bg md:border-r md:border-border py-5 md:py-5 overflow-y-auto transition-transform duration-200 ease-out border-r border-border ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between px-4 mb-3.5 md:px-4">
          <span className="text-[11px] text-muted tracking-[0.1em] font-semibold">ADMIN PANEL</span>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            className="md:hidden text-muted hover:text-text w-8 h-8 inline-flex items-center justify-center rounded-md"
          >
            ✕
          </button>
        </div>
        <nav>
          {navItems.map((n) => (
            <button
              key={n.id}
              onClick={() => selectSection(n.id)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors border-l-2 font-sans ${
                sec === n.id
                  ? 'bg-accent/[0.12] border-accent text-accent font-semibold'
                  : 'border-transparent text-muted2 hover:text-text hover:bg-white/5'
              }`}
            >
              <span className="text-base">{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 p-4 sm:p-5 md:p-6 overflow-auto min-w-0">
        {/* DASHBOARD */}
        {sec === 'dashboard' && (
          <div>
            <div className="font-bold text-lg mb-5">Dashboard</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {[
                { l: 'Total Players', v: players.length,  c: 'var(--accent)' },
                { l: 'Active Raids',  v: activeRaidCount, c: 'var(--green)'  },
                { l: 'Total Entries', v: entries.length,  c: '#a78bfa'       },
              ].map((d) => (
                <div key={d.l} className="bg-card border border-border rounded-xl px-5 py-4">
                  <div className="text-2xl font-bold font-mono" style={{ color: d.c }}>{d.v}</div>
                  <div className="text-xs text-muted mt-1">{d.l}</div>
                </div>
              ))}
            </div>
            <div className="bg-card border border-border rounded-xl px-5 py-4">
              <div className="text-[13px] font-semibold mb-3">Recent Activity</div>
              {renderListControls('activity', entries.length, filteredActivity.length, visibleActivity.length, 'Search activity by player, raid, server, score, or date...')}
              {visibleActivity.map((e, i) => (
                <div
                  key={e.id}
                  className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 py-2 ${
                    i < visibleActivity.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-[13px]">{e.player.ign}</span>
                    <span className="text-xs text-muted ml-2">
                      Entry — {e.raid.raidBoss.name} S{e.raid.season}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 sm:shrink-0">
                    <span className="text-green font-mono text-[13px]">+{e.score.toLocaleString()}</span>
                    <span className="text-muted text-[11px]">
                      {new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
              {filteredActivity.length === 0 && (
                <div className="text-center text-muted text-sm py-8">
                  {entries.length === 0 ? 'No recent activity yet.' : 'No activity matches your search.'}
                </div>
              )}
              {renderShowMore('activity', filteredActivity.length, visibleActivity.length)}
            </div>
          </div>
        )}

        {/* PLAYERS */}
        {sec === 'players' && (
          <div>
            <div className="flex justify-between items-center gap-3 mb-5">
              <div className="font-bold text-lg">
                Players <span className="text-[13px] text-muted font-normal">({players.length})</span>
              </div>
              <button onClick={openAddPlayer} className={addBtnClass}>+ Add Player</button>
            </div>
            {renderListControls('players', players.length, filteredPlayers.length, visiblePlayers.length, 'Search players by IGN, username, club, ID, or status...')}

            {/* Card list (mobile) */}
            <div className="sm:hidden flex flex-col gap-2.5">
              {visiblePlayers.map((p) => (
                <div key={p.id} className="bg-card border border-border rounded-xl p-3.5">
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm break-words">{p.ign}</div>
                      <div className="text-[11px] text-muted font-mono">@{p.username}</div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => openEditPlayer(p)} className={editBtnClass}>Edit</button>
                      <button onClick={() => deletePlayer(p.id)} className={delBtnClass}>Delete</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
                    <div>
                      <div className="text-[10px] text-muted tracking-[0.06em] uppercase">Fav</div>
                      <div className="text-muted2">{p.favouriteStudent || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted tracking-[0.06em] uppercase">Club</div>
                      <div>{p.club || 'Guest'}</div>
                      <div className="text-[10px] text-muted font-mono">
                        {p.clubID || (p.club === 'Guest' ? 'GUEST' : '—')}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[10px] text-muted tracking-[0.06em] uppercase">User ID</div>
                      <div className="font-mono text-[12px] text-muted2 break-all">{p.userID || '—'}</div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredPlayers.length === 0 && (
                <div className="text-center text-muted text-sm py-8">
                  {players.length === 0 ? 'No players yet.' : 'No players match your search.'}
                </div>
              )}
            </div>

            {/* Table (sm+) */}
            <div className="hidden sm:block bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-border2 bg-white/[0.02]">
                      {['IGN','USERNAME','FAV STUDENT','CLUB / ID','USER ID','ACTIONS'].map((h) => (
                        <th key={h} className="px-3.5 py-2.5 text-left text-muted text-[11px] font-semibold tracking-[0.07em] whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePlayers.map((p, i) => (
                      <tr
                        key={p.id}
                        className={i < visiblePlayers.length - 1 ? 'border-b border-border' : ''}
                      >
                        <td className="px-3.5 py-2.5 font-semibold whitespace-nowrap">{p.ign}</td>
                        <td className="px-3.5 py-2.5 text-muted font-mono text-xs whitespace-nowrap">@{p.username}</td>
                        <td className="px-3.5 py-2.5 text-muted2 text-[13px]">{p.favouriteStudent}</td>
                        <td className="px-3.5 py-2.5">
                          <div className="text-[13px]">{p.club || 'Guest'}</div>
                          <div className="text-[11px] text-muted font-mono">{p.clubID || (p.club === 'Guest' ? 'GUEST' : '—')}</div>
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-xs text-muted2">{p.userID || '—'}</td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex gap-1.5">
                            <button onClick={() => openEditPlayer(p)} className={editBtnClass}>Edit</button>
                            <button onClick={() => deletePlayer(p.id)} className={delBtnClass}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredPlayers.length === 0 && (
                  <div className="text-center text-muted text-sm py-8">
                    {players.length === 0 ? 'No players yet.' : 'No players match your search.'}
                  </div>
                )}
              </div>
            </div>
            {renderShowMore('players', filteredPlayers.length, visiblePlayers.length)}
          </div>
        )}

        {/* RAIDS */}
        {sec === 'raids' && (
          <div>
            <div className="flex justify-between items-center gap-3 mb-5">
              <div className="font-bold text-lg">Raids</div>
              <button onClick={openAddRaid} className={addBtnClass}>+ Add Raid</button>
            </div>
            {renderListControls('raids', raids.length, filteredRaids.length, visibleRaids.length, 'Search raids by boss, season, type, server, or date...')}
            <div className="flex flex-col gap-2.5">
              {visibleRaids.map((r) => (
                <div
                  key={r.id}
                  className="bg-card border rounded-xl px-4 py-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  style={{ borderColor: `${r.color}25` }}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className="w-[3px] h-9 rounded-sm shrink-0"
                      style={{ background: r.color, boxShadow: `0 0 8px ${r.color}60` }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold break-words">{r.raidBoss.name}</span>
                        <span className="text-xs text-muted">S{r.season} · {r.type.name}</span>
                        <ServerBadge server={r.server.name} />
                        {r.isActive && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green/15 text-green border border-green/35">
                            LIVE
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted mt-1 font-mono">
                        {fmtDate(r.startDate)} — {fmtDate(r.endDate)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => openEditRaid(r)}
                      className="rounded-md px-3 py-1.5 text-xs font-semibold border transition-colors"
                      style={{
                        background: `${r.color}18`,
                        borderColor: `${r.color}40`,
                        color: r.color,
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteRaid(r.id)}
                      className="rounded-md px-3 py-1.5 text-xs bg-red/10 border border-red/25 text-red hover:bg-red/20 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {filteredRaids.length === 0 && (
                <div className="text-center text-muted text-sm py-8">
                  {raids.length === 0 ? 'No raids yet.' : 'No raids match your search.'}
                </div>
              )}
            </div>
            {renderShowMore('raids', filteredRaids.length, visibleRaids.length)}
          </div>
        )}

        {/* BOSSES */}
        {sec === 'bosses' && (
          <div>
            <div className="flex justify-between items-center gap-3 mb-5">
              <div className="font-bold text-lg">
                Raid Bosses <span className="text-[13px] text-muted font-normal">({bosses.length})</span>
              </div>
              <button onClick={openAddBoss} className={addBtnClass}>+ Add Boss</button>
            </div>
            {renderListControls('bosses', bosses.length, filteredBosses.length, visibleBosses.length, 'Search bosses by name, description, or image URL...')}
            <div className="flex flex-col gap-2.5">
              {visibleBosses.map((b) => (
                <div
                  key={b.id}
                  className="bg-card border border-border rounded-xl px-4 py-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {b.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={proxyImage(b.image)}
                        alt={b.name}
                        className="w-11 h-11 rounded-lg object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-card2 border border-border flex items-center justify-center text-xl shrink-0">
                        ◉
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-sm break-words">{b.name}</div>
                      <div className="text-xs text-muted mt-0.5 max-w-[480px]">
                        {b.description || <span className="italic">No description</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <div className="flex items-center gap-1.5 mr-1">
                      <span
                        className="w-5 h-5 rounded border border-border"
                        style={{ background: b.color }}
                        title="Primary color"
                      />
                      <span
                        className="w-5 h-5 rounded border border-border"
                        style={{ background: b.color2 }}
                        title="Secondary color"
                      />
                    </div>
                    <button onClick={() => openEditBoss(b)} className={editBtnClass}>Edit</button>
                    <button onClick={() => deleteBoss(b.id)} className={delBtnClass}>Delete</button>
                  </div>
                </div>
              ))}
              {filteredBosses.length === 0 && (
                <div className="text-center text-muted text-sm py-8">
                  {bosses.length === 0 ? 'No raid bosses yet.' : 'No raid bosses match your search.'}
                </div>
              )}
            </div>
            {renderShowMore('bosses', filteredBosses.length, visibleBosses.length)}
          </div>
        )}

        {/* ENTRIES */}
        {sec === 'entries' && (
          <div>
            <div className="flex justify-between items-center gap-3 mb-5">
              <div className="font-bold text-lg">Entries</div>
              <button onClick={openAddEntry} className={addBtnClass}>+ Add Entry</button>
            </div>
            {renderListControls('entries', entries.length, filteredEntries.length, visibleEntries.length, 'Search entries by player, raid, server, score, or date...')}

            {/* Card list (mobile) */}
            <div className="sm:hidden flex flex-col gap-2.5">
              {visibleEntries.map((e) => (
                <div key={e.id} className="bg-card border border-border rounded-xl p-3.5">
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm break-words">{e.player.ign}</div>
                      <div className="text-[11px] text-muted2 mt-0.5 break-words">
                        {e.raid.raidBoss.name} S{e.raid.season}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => openEditEntry(e)} className={editBtnClass}>Edit</button>
                      <button onClick={() => deleteEntry(e.id)} className={delBtnClass}>Del</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <ServerBadge server={e.raid.server.name} />
                      <span className="text-muted font-mono text-[11px]">
                        {new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <span className="font-mono text-accent font-semibold">
                      {e.score.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
              {filteredEntries.length === 0 && (
                <div className="text-center text-muted text-sm py-8">
                  {entries.length === 0 ? 'No entries yet.' : 'No entries match your search.'}
                </div>
              )}
            </div>

            {/* Table (sm+) */}
            <div className="hidden sm:block bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-border2 bg-white/[0.02]">
                      {['PLAYER','RAID','SERVER','SCORE','DATE','ACTIONS'].map((h) => (
                        <th key={h} className="px-3.5 py-2.5 text-left text-muted text-[11px] font-semibold tracking-[0.07em] whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEntries.map((e, i) => (
                      <tr
                        key={e.id}
                        className={i < visibleEntries.length - 1 ? 'border-b border-border' : ''}
                      >
                        <td className="px-3.5 py-2.5 font-semibold whitespace-nowrap">{e.player.ign}</td>
                        <td className="px-3.5 py-2.5 text-muted2">{e.raid.raidBoss.name} S{e.raid.season}</td>
                        <td className="px-3.5 py-2.5"><ServerBadge server={e.raid.server.name} /></td>
                        <td className="px-3.5 py-2.5 font-mono text-accent font-semibold">{e.score.toLocaleString()}</td>
                        <td className="px-3.5 py-2.5 text-muted font-mono text-xs whitespace-nowrap">
                          {new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex gap-1.5">
                            <button onClick={() => openEditEntry(e)} className={editBtnClass}>Edit</button>
                            <button onClick={() => deleteEntry(e.id)} className={delBtnClass}>Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredEntries.length === 0 && (
                  <div className="text-center text-muted text-sm py-8">
                    {entries.length === 0 ? 'No entries yet.' : 'No entries match your search.'}
                  </div>
                )}
              </div>
            </div>
            {renderShowMore('entries', filteredEntries.length, visibleEntries.length)}
          </div>
        )}

        {sec === 'settings' && (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-muted gap-3">
            <div className="text-4xl">⊛</div>
            <div className="text-[15px] font-semibold text-muted2">Settings</div>
            <div className="text-[13px]">Site configuration would go here in production.</div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast} />}

      {/* Player modal */}
      {modal === 'player' && (
        <StModal title={editTarget ? 'Edit Player' : 'Add Player'} onClose={() => setModal(null)} extraWide>
          <form onSubmit={savePlayer}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <StField label="IGN">
                <input className={inputClass} type="text" value={pForm.ign} onChange={e => setPForm(f => ({ ...f, ign: e.target.value }))} placeholder="In-game name" required />
              </StField>
              <StField label="USERNAME">
                <input className={inputClass} type="text" value={pForm.username} onChange={e => setPForm(f => ({ ...f, username: e.target.value }))} placeholder="@handle" required />
              </StField>
              <StField label="FAVOURITE STUDENT (AVATAR)">
                <select className={inputClass} value={pForm.favouriteStudent} onChange={e => setPForm(f => ({ ...f, favouriteStudent: e.target.value }))}>
                  {STUDENTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </StField>
              <StField label="JOINED DATE">
                <input className={inputClass} type="date" value={pForm.joinedDate} onChange={e => setPForm(f => ({ ...f, joinedDate: e.target.value }))} />
              </StField>
            </div>
            {/* Guest toggle */}
            <div className="flex items-center gap-3 mb-3 mt-1">
              <button
                type="button"
                role="switch"
                aria-checked={isGuest}
                onClick={() => setIsGuest(v => !v)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${isGuest ? 'bg-accent' : 'bg-border'}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${isGuest ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
              <span className="text-[11px] font-bold tracking-[0.1em] text-muted2">GUEST</span>
              {isGuest && <span className="text-[11px] text-muted">Player has no club</span>}
            </div>
            {!isGuest && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <StField label="CLUB">
                  <input className={inputClass} type="text" value={pForm.club} onChange={e => setPForm(f => ({ ...f, club: e.target.value }))} placeholder="Club name" />
                </StField>
                <StField label="CLUB ID">
                  <input className={inputClass} type="text" value={pForm.clubID} onChange={e => setPForm(f => ({ ...f, clubID: e.target.value }))} placeholder="e.g. MIL001" />
                </StField>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <StField label="USER ID">
                <input className={inputClass} type="text" value={pForm.userID} onChange={e => setPForm(f => ({ ...f, userID: e.target.value }))} placeholder="e.g. USR011" />
              </StField>
            </div>
            <button type="submit" className={submitBtnClass}>
              {editTarget ? 'Save Changes' : 'Add Player'}
            </button>
          </form>
        </StModal>
      )}

      {/* Boss modal */}
      {modal === 'boss' && (
        <StModal title={editTarget ? 'Edit Raid Boss' : 'Add Raid Boss'} onClose={() => setModal(null)} extraWide>
          <form onSubmit={saveBoss}>
            <StField label="BOSS NAME" span2>
              <input className={inputClass} type="text" value={bForm.name} onChange={e => setBForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Void Sanctum" required />
            </StField>
            <StField label="IMAGE URL" span2>
              <input className={inputClass} type="text" value={bForm.image} onChange={e => setBForm(f => ({ ...f, image: e.target.value }))} placeholder="https://... (optional)" />
            </StField>
            {bForm.image && (
              <div className="mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proxyImage(bForm.image)}
                  alt="Preview"
                  className="h-20 rounded-lg border border-border object-cover"
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <StField label="PRIMARY COLOR">
                <input className={`${inputClass} h-11`} type="color" value={bForm.color} onChange={e => setBForm(f => ({ ...f, color: e.target.value }))} />
              </StField>
              <StField label="SECONDARY COLOR">
                <input className={`${inputClass} h-11`} type="color" value={bForm.color2} onChange={e => setBForm(f => ({ ...f, color2: e.target.value }))} />
              </StField>
              <StField label="PATTERN" span2>
                <select className={inputClass} value={bForm.pattern} onChange={e => setBForm(f => ({ ...f, pattern: e.target.value }))}>
                  <option value="hex">Hexagons</option>
                  <option value="grid">Grid</option>
                  <option value="diamond">Diamond</option>
                  <option value="dot">Dots</option>
                </select>
              </StField>
            </div>
            <StField label="DESCRIPTION" span2>
              <textarea
                className={`${inputClass} min-h-20 resize-y`}
                value={bForm.description}
                onChange={e => setBForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Boss lore / description…"
              />
            </StField>
            <button type="submit" className={submitBtnClass}>
              {editTarget ? 'Save Changes' : 'Add Boss'}
            </button>
          </form>
        </StModal>
      )}

      {/* Raid modal */}
      {modal === 'raid' && (
        <StModal title={editTarget ? 'Edit Raid' : 'Add Raid'} onClose={() => setModal(null)} extraWide>
          <form onSubmit={saveRaid}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <StField label="RAID BOSS" span2>
                <select className={inputClass} value={rForm.raidBossId} onChange={e => setRForm(f => ({ ...f, raidBossId: e.target.value }))} required>
                  <option value="">— Select Boss —</option>
                  {bosses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </StField>
              <StField label="SEASON">
                <input className={inputClass} type="number" min="1" value={rForm.season} onChange={e => setRForm(f => ({ ...f, season: e.target.value }))} placeholder="e.g. 3" required />
              </StField>
              <StField label="TYPE">
                <select className={inputClass} value={rForm.typeId} onChange={e => setRForm(f => ({ ...f, typeId: e.target.value }))} required>
                  <option value="">— Select Type —</option>
                  {raidTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  {raidTypes.length === 0 && RAID_TYPES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </StField>
              <StField label="SERVER">
                <select className={inputClass} value={rForm.serverId} onChange={e => setRForm(f => ({ ...f, serverId: e.target.value }))} required>
                  <option value="">— Select Server —</option>
                  {raidServers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  {raidServers.length === 0 && RAID_SERVERS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </StField>
              <StField label="START DATE">
                <input className={inputClass} type="date" value={rForm.startDate} onChange={e => setRForm(f => ({ ...f, startDate: e.target.value }))} required />
              </StField>
              <StField label="END DATE">
                <input className={inputClass} type="date" value={rForm.endDate} onChange={e => setRForm(f => ({ ...f, endDate: e.target.value }))} required />
              </StField>
            </div>
            <button type="submit" className={submitBtnClass}>
              {editTarget ? 'Save Changes' : 'Add Raid'}
            </button>
          </form>
        </StModal>
      )}

      {/* Entry modal */}
      {modal === 'entry' && (
        <StModal title={editTarget ? 'Edit Entry' : 'Add Entry'} onClose={() => setModal(null)} extraWide>
          <form onSubmit={saveEntry}>
            <StField label="PLAYER" span2>
              <select className={inputClass} value={eForm.playerId} onChange={e => setEForm(f => ({ ...f, playerId: e.target.value }))} required>
                <option value="">— Select Player —</option>
                {players.map(p => <option key={p.id} value={p.id}>{p.ign} (@{p.username})</option>)}
              </select>
            </StField>
            <StField label="RAID" span2>
              <select className={inputClass} value={eForm.raidId} onChange={e => setEForm(f => ({ ...f, raidId: e.target.value }))}>
                {raids.map(r => <option key={r.id} value={r.id}>{r.raidBoss.name} — S{r.season} ({r.server.name})</option>)}
              </select>
            </StField>
            <StField label="SCORE" span2>
              <input className={inputClass} type="number" placeholder="e.g. 12500" value={eForm.score} onChange={e => setEForm(f => ({ ...f, score: e.target.value }))} required />
            </StField>
            <button type="submit" className={submitBtnClass}>
              {editTarget ? 'Save Changes' : 'Add Entry'}
            </button>
          </form>
        </StModal>
      )}
    </div>
  )
}
