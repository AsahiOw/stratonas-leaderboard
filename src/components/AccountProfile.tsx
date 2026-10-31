'use client'

import Link from 'next/link'
import { signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowUpRight, Check, ChevronRight, MoveHorizontal, Pencil, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { PlayerRankChart } from '@/components/PlayerRankChart'
import { PlayerParticipation, type PlayerParticipationEntry } from '@/components/PlayerParticipation'
import { RaidDetailModal } from '@/components/RaidDetailModal'
import { ProfileStudentSlot } from '@/components/ProfilePetProvider'
import { useLocalPlayerData, usePlayerIdentityCache } from '@/components/PlayerIdentityProvider'
import { FavouriteStudentPicker, type FavouriteStudentChoice } from '@/components/FavouriteStudentPicker'
import ProgressiveImage from '@/components/ui/ProgressiveImage'
import { fmtDate, hexToRgb, imageSrc, memorialPosterSrc } from '@/lib/utils'
import styles from './AccountProfile.module.css'

interface Profile {
  user: { name?: string | null; email?: string | null; role: string }
  discordId: string | null
  player: {
    id: string; ign: string; username: string; userID: string | null
    club: string | null; clubData: { id: string; name: string; color: string } | null
    favouriteStudent: string | null; favouriteStudentId: number | null; joinedDate: string; isGuildMember: boolean
    ignImportLocked: boolean; favouriteStudentImportLocked: boolean
    favouriteStudentData: PlayerRecord['favouriteStudentData']
  } | null
}

interface PlayerRecord {
  id: string
  favouriteStudentData: { id: number; name: string; image: string; portrait?: string | null; memorial?: string | null } | null
  entries: PlayerParticipationEntry[]
  journey: {
    bestRank: number | null; totalEntries: number; podiums: number
    averageRank: number; latestRank: number | null; participationRate: number
    latestRaid: string | null; latestPercentile: number | null
  }
}

type View = 'overview' | 'history' | 'account'
const actionClass = styles.button
const rank = (value: number | null | undefined) => value ? `#${value.toLocaleString('en-US')}` : '—'

export function AccountProfile() {
  const { remember } = usePlayerIdentityCache()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [record, setRecord] = useState<PlayerRecord | null>(null)
  const [recordError, setRecordError] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [revision, setRevision] = useState(0)
  const [view, setView] = useState<View>('overview')
  const [editing, setEditing] = useState(false)
  const [choosingStudent, setChoosingStudent] = useState(false)
  const [ign, setIgn] = useState('')
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingLock, setSavingLock] = useState(false)
  const [query, setQuery] = useState('')
  const [raidType, setRaidType] = useState('all')
  const [latestOpen, setLatestOpen] = useState(false)
  const [hideGuests, setHideGuests] = useState(false)
  const ignInput = useRef<HTMLInputElement>(null)
  const favouriteButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoadError(false)
      setRecordError(false)
      try {
        const response = await fetch('/api/profile', { cache: 'no-store', signal: controller.signal })
        if (response.status === 401) { router.replace('/login'); return }
        if (!response.ok) throw new Error('Could not load profile')
        const data: Profile = await response.json()
        setProfile(data)
        setIgn(data.player?.ign || '')
        if (!data.player) { setRecord(null); return }
        try {
          const result = await fetch(`/api/players/${data.player.id}`, { signal: controller.signal })
          if (!result.ok) throw new Error('Could not load player')
          setRecord(await result.json())
        } catch { if (!controller.signal.aborted) setRecordError(true) }
      } catch { if (!controller.signal.aborted) setLoadError(true) }
    }
    void load()
    return () => controller.abort()
  }, [router, revision])

  useEffect(() => { if (editing) ignInput.current?.focus() }, [editing])

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(''), 5000)
    return () => window.clearTimeout(timer)
  }, [message])

  function cancelEdit() {
    setIgn(player?.ign || '')
    setEditing(false)
    setMessage('')
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setFailed(false)
    try {
      const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ign }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save IGN. Try again.')
      setProfile((current) => current?.player ? { ...current, player: { ...current.player, ign: data.ign } } : current)
      setIgn(data.ign)
      if (player) remember({ playerId: player.id, ign: data.ign, favouriteStudentData: player.favouriteStudentData })
      setEditing(false)
      setMessage('IGN saved. Your player profile and leaderboards now use this name.')
    } catch (error) {
      setFailed(true)
      setMessage(error instanceof Error ? error.message : 'Could not save IGN. Try again.')
    } finally { setSaving(false) }
  }

  function closeStudentChoices() {
    setChoosingStudent(false)
    favouriteButton.current?.focus()
  }

  async function setImportLock(key: 'ignImportLocked' | 'favouriteStudentImportLocked', locked: boolean) {
    setSavingLock(true)
    setMessage('')
    setFailed(false)
    try {
      const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: locked }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save import protection. Try again.')
      setProfile((current) => current?.player ? { ...current, player: { ...current.player, [key]: data[key] } } : current)
      setMessage(`${key === 'ignImportLocked' ? 'IGN' : 'Favourite student'} ${locked ? 'protected from XLSX imports' : 'can now be updated by XLSX imports'}.`)
    } catch (error) {
      setFailed(true)
      setMessage(error instanceof Error ? error.message : 'Could not save import protection. Try again.')
    } finally { setSavingLock(false) }
  }

  function favouriteSaved(student: FavouriteStudentChoice) {
    setProfile((current) => current?.player ? { ...current, player: { ...current.player, favouriteStudentId: student.id, favouriteStudent: student.name, favouriteStudentData: student } } : current)
    setFailed(false)
    if (player) remember({ playerId: player.id, ign: player.ign, favouriteStudentData: student })
    setMessage(`Favourite student saved: ${student.name}.`)
    closeStudentChoices()
  }

  const player = useLocalPlayerData(profile?.player)
  const student = player?.favouriteStudentData
  const club = player?.clubData?.name || player?.club || 'Guest'
  const journey = record?.journey
  const entries = record?.entries || []
  const latest = entries[0]
  const coverFallback = imageSrc(student?.image, '/assets/icons/icon.webp')
  const cover = memorialPosterSrc(student?.memorial, coverFallback)
  const accent = player?.clubData?.color || '#4f8ef7'
  const name = player?.ign || profile?.user.name || 'Welcome to Stratónas'
  const filtered = entries.filter((entry) => (raidType === 'all' || entry.raid.type.name.toLowerCase().includes(raidType))
    && `${entry.raid.raidBoss.name} ${entry.raid.season} ${entry.raid.terrain.name} ${entry.raid.server.name}`.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <main className={styles.page} style={{ '--club-color': accent, '--club-rgb': hexToRgb(accent) } as CSSProperties}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/" className={styles.brand}><ProgressiveImage src="/assets/icons/icon.webp" alt="" width={30} height={30} className="h-[30px] w-[30px] rounded-full" />Stratónas</Link>
          <div className={styles.headerLinks}>
            {player && <Link href={`/players/${player.id}`}>Public profile<ArrowUpRight size={15} aria-hidden /></Link>}
          </div>
        </header>

        {loadError ? <section role="alert" className={styles.empty}>
          <h1 className={styles.sectionHeading}>Your profile couldn’t load</h1>
          <p className={styles.description}>Check your connection and try again.</p>
          <button className={actionClass} onClick={() => setRevision((value) => value + 1)}><RefreshCw size={15} />Try again</button>
        </section> : !profile ? <div role="status" className="flex min-h-[70vh] items-center justify-center text-muted2">Loading your player space…</div> : <>
          <section aria-label="Player identity" className={styles.hero}>
            <div className={styles.heroBackdrop} aria-hidden="true"><ProgressiveImage src={cover} alt="" /></div>
            <div className={styles.cover} data-empty={!student?.image}>
              <ProgressiveImage key={cover} src={cover} alt="" priority onError={(event) => { if (event.currentTarget.getAttribute('src') !== coverFallback) event.currentTarget.src = coverFallback; else event.currentTarget.hidden = true }} />
            </div>
            <div className={styles.identity}>
              <div className={styles.identityInfo}>
                <h1 className={styles.name} data-long={name.length > 24}>{name}</h1>
                {player && <p className={styles.username}>@{player.username}</p>}
                <div className={styles.club}><span className={styles.clubDot} />{player?.clubData ? <Link href={`/clubs/${player.clubData.id}`}>{club}</Link> : player ? club : 'Your player space'}</div>
              </div>
              {journey && <dl className={styles.stats}>
                {[[rank(journey.bestRank), 'Best rank'], [String(journey.totalEntries), 'Raids played'], [rank(journey.latestRank), 'Latest rank']].map(([value, label]) => <div key={label} className={styles.stat}><dt>{label}</dt><dd>{value}</dd></div>)}
              </dl>}
            </div>
            <div className={styles.actions}>
              {player && !editing && <button onClick={() => { setMessage(''); setChoosingStudent(false); setIgn(player.ign); setEditing(true) }} className={actionClass}><Pencil size={14} aria-hidden />Edit IGN</button>}
              {player && <button ref={favouriteButton} className={actionClass} aria-expanded={choosingStudent} aria-controls="favourite-student-choices" onClick={() => { cancelEdit(); setChoosingStudent((value) => !value) }}><Pencil size={14} aria-hidden />Change favourite student</button>}
            </div>
            {student && <div className={styles.exhibit}>
              <ProfileStudentSlot student={student} />
              <p className={styles.exhibitHint}><MoveHorizontal size={13} aria-hidden />Drag to rotate<span className="sr-only">, or focus the model and use the left and right arrow keys.</span></p>
            </div>}
          </section>

          {editing && <form onSubmit={save} className={styles.editor} onKeyDown={(event) => { if (event.key === 'Escape' && !saving) cancelEdit() }}>
            <label htmlFor="profile-ign">In-game name</label>
            <input ref={ignInput} id="profile-ign" value={ign} maxLength={64} required disabled={saving} onChange={(event) => setIgn(event.target.value)} aria-describedby="ign-help" />
            {player && <fieldset className={styles.importLocks} disabled={savingLock}>
              <legend>Import protection</legend>
              <label><input type="checkbox" checked={player.ignImportLocked} onChange={(event) => void setImportLock('ignImportLocked', event.target.checked)} />Lock IGN against XLSX imports</label>
              <p>You can still edit it here. Lock changes save automatically.</p>
            </fieldset>}
            <div className={styles.actions}>
              <button disabled={saving || !ign.trim() || ign.trim() === player?.ign} className={`${actionClass} ${styles.primary}`}><Check size={15} />{saving ? 'Saving…' : 'Save IGN'}</button>
              <button type="button" disabled={saving} onClick={cancelEdit} className={actionClass}><X size={15} />Cancel</button>
            </div>
            <p id="ign-help">This updates your name on your public profile and leaderboards.</p>
          </form>}

          {player && choosingStudent && <div id="favourite-student-choices"><FavouriteStudentPicker currentId={player.favouriteStudentId} onSaved={favouriteSaved} onClose={closeStudentChoices} importLocked={player.favouriteStudentImportLocked} savingLock={savingLock} onImportLockChange={(locked) => void setImportLock('favouriteStudentImportLocked', locked)} /></div>}

          {message && <div role={failed ? 'alert' : 'status'} className={styles.message} data-error={failed}><span>{message}</span><button type="button" aria-label="Dismiss notification" onClick={() => setMessage('')}><X size={16} aria-hidden /></button></div>}
          <nav aria-label="Profile sections" className={styles.tabs}>
            {(['overview', 'history', 'account'] as const).map((item) => <button key={item} aria-pressed={view === item} onClick={() => setView(item)}>{item === 'overview' ? 'Overview' : item === 'history' ? 'Raid history' : 'Account'}</button>)}
          </nav>

          <div id="profile-content" className={styles.content}>
            {view === 'account' ? <section aria-label="Account" className={styles.account}>
              <h2 className={styles.sectionHeading}>Your account</h2>
              <p className={styles.description}>Your Discord identity connects you to your player record.</p>
              <dl><div><dt>Signed in as</dt><dd>{profile.user.name || profile.user.email || 'Stratónas member'}</dd></div><div><dt>Discord ID</dt><dd>{profile.discordId || 'No Discord account linked'}</dd></div><div><dt>Access</dt><dd>{profile.user.role === 'ADMIN' ? 'Administrator' : profile.user.role === 'MANAGER' ? 'Manager' : 'Member'}</dd></div></dl>
              <div className={styles.actions}>
                {!profile.discordId && <button onClick={async () => { if (profile.user.role !== 'VIEWER') await signOut({ redirect: false }); await signIn('discord', { callbackUrl: '/profile' }) }} className={actionClass}>{profile.user.role === 'VIEWER' ? 'Link Discord account' : 'Switch to Discord account'}</button>}
                {profile.user.role !== 'VIEWER' && <Link href="/admin" className={actionClass}><ShieldCheck size={16} />Open dashboard</Link>}
                <button onClick={() => signOut({ callbackUrl: '/' })} className={actionClass}>Sign out</button>
              </div>
            </section> : !player ? <section className={styles.empty}>
              <h2 className={styles.sectionHeading}>Your player record is waiting to be linked</h2>
              <p className={styles.description}>Ask an administrator to match your player’s User ID with the Discord ID in your account. Your raid history will appear here once it’s linked.</p>
              <button onClick={() => setRevision((value) => value + 1)} className={actionClass}><RefreshCw size={15} />Check again</button>
            </section> : recordError ? <section role="alert" className={styles.empty}>
              <h2 className={styles.sectionHeading}>Your player statistics couldn’t load</h2>
              <p className={styles.description}>Your account is linked. Try loading your raid data again.</p>
              <button className={actionClass} onClick={() => setRevision((value) => value + 1)}><RefreshCw size={15} />Try again</button>
            </section> : !record ? <p role="status" className={styles.description}>Loading raid history…</p> : view === 'history' ? <section aria-label="Raid history">
              <div className={styles.historyHead}>
                <div><h2 className={styles.sectionHeading}>Your raid history</h2><p className={styles.description}>{filtered.length} of {entries.length} results. Open a raid to see your place on its leaderboard.</p></div>
                <label className="w-full sm:w-auto"><span className="sr-only">Search raid history</span><input type="search" className={styles.search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search boss, season, or server" /></label>
              </div>
              <div className={styles.filters} aria-label="Filter raids">{[['all', 'All raids'], ['total', 'Total Assault'], ['grand', 'Grand Assault']].map(([value, label]) => <button key={value} aria-pressed={raidType === value} onClick={() => setRaidType(value)} className={actionClass}>{label}</button>)}</div>
              {filtered.length ? <PlayerParticipation entries={filtered} playerId={player.id} accent={accent} /> : <div className={styles.empty}><p className={styles.description}>{entries.length ? 'No raids match these filters.' : 'Your first raid result will appear here.'}</p>{entries.length > 0 && <button onClick={() => { setQuery(''); setRaidType('all') }} className={actionClass}>Clear filters</button>}</div>}
            </section> : <>
              {latest ? <section className={styles.latest} aria-labelledby="latest-raid-title">
                <div className={styles.latestIdentity}>
                  <p className={styles.latestLabel}>Latest raid</p>
                  <h2 id="latest-raid-title">{latest.raid.raidBoss.name} <span>· S{latest.raid.season}</span></h2>
                  <p className={styles.raidMeta}>{latest.raid.type.name} · {latest.raid.terrain.name} · {latest.raid.server.name}</p>
                  <p className={styles.raidDate}>{fmtDate(latest.raid.startDate)} — {fmtDate(latest.raid.endDate)}</p>
                </div>
                <dl className={styles.latestNumbers}><div><dt>Rank</dt><dd>{rank(latest.rank)}</dd></div><div><dt>Score</dt><dd>{latest.score.toLocaleString('en-US')}</dd></div></dl>
                <button onClick={() => setLatestOpen(true)} className={actionClass}>Open leaderboard<ArrowUpRight size={15} aria-hidden /></button>
              </section> : <p className={styles.description}>Your first raid result will appear here.</p>}
              <div className={styles.overview}>
                <div className="min-w-0">
                  <PlayerRankChart accent={accent} points={entries.filter((entry) => entry.rank > 0 && entry.raid.startDate).map((entry) => ({ id: entry.id, rank: entry.rank, date: new Date(entry.raid.startDate!).toISOString(), raidType: entry.raid.type.name, label: `${entry.raid.raidBoss.name} S${entry.raid.season} · ${entry.raid.server.name}` }))} />
                  <div className={styles.sectionRow}><h2 className={styles.sectionHeading}>Recent raids</h2>{entries.length > 3 && <button onClick={() => setView('history')} className={styles.quiet}>View all {entries.length}<ChevronRight size={16} /></button>}</div>
                  <PlayerParticipation hideHeading entries={entries.slice(0, 3)} playerId={player.id} accent={accent} />
                </div>
                <aside className={styles.details}>
                  <h2>Player details</h2>
                  <dl>{[['Club', club], ['Membership', player.isGuildMember ? 'Guild member' : 'Guest'], ['Joined', fmtDate(player.joinedDate)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
                  {journey && <div className={styles.insights}>
                    <h3>Performance notes</h3>
                    <p><strong>{journey.participationRate}% participation</strong><span>Of recorded raids on servers you’ve played.</span></p>
                    {latest && journey.latestPercentile !== null && <p><strong>Top {journey.latestPercentile}% in your latest raid</strong><span>Among players on this site’s {latest.raid.server.name} leaderboard for {latest.raid.raidBoss.name} S{latest.raid.season} ({latest.raid.type.name}).</span></p>}
                    <p className={styles.scope}>Ranks are placements on each recorded raid leaderboard. Different raid types and participant pools are not directly comparable.</p>
                  </div>}
                </aside>
              </div>
            </>}
          </div>
        </>}
        {latestOpen && latest && player && <RaidDetailModal raid={latest.raid} onClose={() => setLatestOpen(false)} hideGuests={hideGuests} onToggleGuests={() => setHideGuests((value) => !value)} focusPlayerId={player.id} onPlayerClick={(id) => router.push(`/players/${id}`)} />}
      </div>
    </main>
  )
}
