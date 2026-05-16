'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { ServerBadge } from '@/components/ui/ServerBadge'
import { StModal } from '@/components/ui/StModal'
import { StField, inputClass } from '@/components/ui/StField'
import { Toast } from '@/components/ui/Toast'
import { fmtDate, imageSrc, proxyImage } from '@/lib/utils'

interface Club {
  id: string; name: string; uid?: string | null; logo?: string | null; color: string; createdAt?: string; updatedAt?: string
  _count?: { players: number }
}

interface Player {
  id: string; ign: string; username: string; favouriteStudent?: string | null
  favouriteStudentId?: number | null; favouriteStudentData?: Student | null
  joinedDate?: string | null; club?: string | null; clubID?: string | null
  clubId?: string | null; clubData?: Club | null
  userID?: string | null; isGuildMember: boolean
}

interface Student {
  id: number; name: string; image: string; portrait?: string | null; memorial?: string | null
  familyName?: string | null; personalName?: string | null; school?: string | null; club?: string | null
  schoolYear?: string | null; characterAge?: string | null; birthday?: string | null; birthDay?: string | null
  hobby?: string | null; heightMetric?: string | null; weaponType?: string | null; tacticRole?: string | null
  position?: string | null; weaponName?: string | null; accentColor?: string | null
  memorialOffsetX: number; memorialOffsetY: number; memorialScale: number
  portraitOffsetX: number; portraitOffsetY: number; portraitScale: number
}

interface ImportState {
  id: string; status: 'idle' | 'running' | 'completed' | 'failed' | string
  total: number; processed: number; added: number; skipped: number
  error?: string | null; startedAt?: string | null; completedAt?: string | null
}

interface RaidBoss {
  id: string; schaleId?: number | null; name: string; description: string; image?: string | null
  color: string; color2: string; pattern: string
}

interface RaidType {
  id: string; name: string
}

interface RaidServer {
  id: string; name: string
}

interface RaidTerrain {
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
  terrainId: string
  terrain: RaidTerrain
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

interface XlsxImportResult {
  raid: { id: string; title: string; created: boolean }
  rowsRead: number
  rowsImported: number
  playersCreated: number
  playersUpdated: number
  clubsCreated: number
  clubsReused: number
  entriesCreated: number
  entriesUpdated: number
  skippedRows: Array<{ row: number; reason: string }>
  unmatchedFavoriteStudents: string[]
}

interface XlsxImportProgress {
  status: 'idle' | 'running' | 'completed' | 'failed' | string
  stage: string
  total: number
  processed: number
  rowsImported: number
  playersCreated: number
  playersUpdated: number
  entriesCreated: number
  entriesUpdated: number
  currentSheet?: string | null
  currentRow?: number | null
  error?: string | null
}

type Section = 'dashboard' | 'players' | 'clubs' | 'students' | 'raids' | 'bosses' | 'entries' | 'import' | 'settings'
type ListSection = 'activity' | 'players' | 'clubs' | 'students' | 'raids' | 'bosses' | 'entries'

const navItems: { id: Section; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'players', label: 'Players', icon: '◎' },
  { id: 'clubs', label: 'Clubs', icon: '◇' },
  { id: 'students', label: 'Students', icon: '◌' },
  { id: 'raids', label: 'Raids', icon: '⬡' },
  { id: 'bosses', label: 'Bosses', icon: '◉' },
  { id: 'entries', label: 'Entries', icon: '⊞' },
  { id: 'import', label: 'Import', icon: '⇪' },
  { id: 'settings', label: 'Settings', icon: '⊛' },
]

const RAID_TYPES = ['Total Assault', 'Grand Assault']
const RAID_SERVERS = ['Global', 'JP']

function serverOptionLabel(name: string) {
  return name.toLowerCase() === 'japan' || name.toLowerCase() === 'jp' ? 'JP' : name
}

const editBtnClass =
  'bg-accent/[0.12] border border-accent/30 rounded-md px-2.5 py-1 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors'
const delBtnClass =
  'bg-red/10 border border-red/25 rounded-md px-2.5 py-1 text-red text-xs hover:bg-red/20 transition-colors'
const colorSwatchClass =
  'inline-block h-5 w-5 rounded-md border border-border align-middle'
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
  const [players, setPlayers] = useState<Player[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [raids, setRaids] = useState<Raid[]>([])
  const [bosses, setBosses] = useState<RaidBoss[]>([])
  const [raidTypes, setRaidTypes] = useState<RaidType[]>([])
  const [raidServers, setRaidServers] = useState<RaidServer[]>([])
  const [raidTerrains, setRaidTerrains] = useState<RaidTerrain[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [modal, setModal] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<Player | Club | Student | Raid | Entry | RaidBoss | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [xlsxImportResult, setXlsxImportResult] = useState<XlsxImportResult | null>(null)
  const [xlsxImporting, setXlsxImporting] = useState(false)
  const [xlsxImportProgress, setXlsxImportProgress] = useState<XlsxImportProgress | null>(null)
  const [importState, setImportState] = useState<ImportState | null>(null)
  const [showImportProgress, setShowImportProgress] = useState(false)
  const [bossImportState, setBossImportState] = useState<ImportState | null>(null)
  const [showBossImportProgress, setShowBossImportProgress] = useState(false)
  const [xlsxForm, setXlsxForm] = useState({
    server: '',
    startDate: '',
    endDate: '',
  })
  const [xlsxFile, setXlsxFile] = useState<File | null>(null)
  const [search, setSearch] = useState<Record<ListSection, string>>({
    activity: '',
    players: '',
    clubs: '',
    students: '',
    raids: '',
    bosses: '',
    entries: '',
  })
  const [visibleRows, setVisibleRows] = useState<Record<ListSection, number>>({
    activity: INITIAL_VISIBLE_ROWS,
    players: INITIAL_VISIBLE_ROWS,
    clubs: INITIAL_VISIBLE_ROWS,
    students: INITIAL_VISIBLE_ROWS,
    raids: INITIAL_VISIBLE_ROWS,
    bosses: INITIAL_VISIBLE_ROWS,
    entries: INITIAL_VISIBLE_ROWS,
  })

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  function playerClubName(player: Player) {
    return player.clubData?.name || player.club || 'Guest'
  }

  const importServerOptions = useMemo(() => [
    ...raidServers.map((server) => ({
      key: server.id,
      value: server.id,
      label: serverOptionLabel(server.name),
    })),
    ...RAID_SERVERS
      .filter((name) => !raidServers.some((server) => serverOptionLabel(server.name) === serverOptionLabel(name)))
      .map((name) => ({
        key: name,
        value: name,
        label: serverOptionLabel(name),
      })),
  ], [raidServers])

  const loadPlayers = useCallback(() => fetch('/api/admin/players').then(r => r.json()).then(setPlayers), [])
  const loadClubs = useCallback(() => fetch('/api/admin/clubs').then(r => r.json()).then(setClubs), [])
  const loadStudents = useCallback(() => fetch('/api/admin/students').then(r => r.json()).then(setStudents), [])
  const loadRaids = useCallback(() => fetch('/api/raids').then(r => r.json()).then(setRaids), [])
  const loadBosses = useCallback(() => fetch('/api/raid-bosses').then(r => r.json()).then(setBosses), [])
  const loadEntries = useCallback(() => fetch('/api/admin/entries').then(r => r.json()).then(setEntries), [])
  const loadImportStatus = useCallback(() => fetch('/api/admin/students/import/status').then(r => r.json()).then(setImportState), [])
  const loadBossImportStatus = useCallback(() => fetch('/api/admin/raid-bosses/import/status').then(r => r.json()).then(setBossImportState), [])
  const loadRaidLookups = useCallback(() => {
    fetch('/api/admin/raid-lookups')
      .then(r => r.json())
      .then((data: { types: RaidType[]; servers: RaidServer[]; terrains: RaidTerrain[] }) => {
        setRaidTypes(data.types)
        setRaidServers(data.servers)
        setRaidTerrains(data.terrains)
      })
  }, [])

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
        setRaidTerrains([raids[0].terrain, ...raids
          .map((r: Raid) => r.terrain)
          .filter((t: RaidTerrain, i: number, arr: RaidTerrain[]) => arr.findIndex(x => x.id === t.id) === i)
          .slice(1)])
      }
    })
  }, [])

  useEffect(() => {
    loadPlayers(); loadClubs(); loadStudents(); loadRaids(); loadBosses(); loadEntries(); loadLookups(); loadRaidLookups(); loadImportStatus(); loadBossImportStatus()
  }, [loadPlayers, loadClubs, loadStudents, loadRaids, loadBosses, loadEntries, loadLookups, loadRaidLookups, loadImportStatus, loadBossImportStatus])

  useEffect(() => {
    if (!showImportProgress || importState?.status !== 'running') return
    const timer = window.setInterval(() => {
      loadImportStatus()
      loadStudents()
    }, 1000)
    return () => window.clearInterval(timer)
  }, [showImportProgress, importState?.status, loadImportStatus, loadStudents])

  useEffect(() => {
    if (!showBossImportProgress || bossImportState?.status !== 'running') return
    const timer = window.setInterval(() => {
      loadBossImportStatus()
      loadBosses()
    }, 1000)
    return () => window.clearInterval(timer)
  }, [showBossImportProgress, bossImportState?.status, loadBossImportStatus, loadBosses])

  useEffect(() => {
    if (importState?.status !== 'completed') return
    loadStudents()
    loadPlayers()
  }, [importState?.status, loadPlayers, loadStudents])

  useEffect(() => {
    if (bossImportState?.status !== 'completed') return
    loadBosses()
    loadRaids()
  }, [bossImportState?.status, loadBosses, loadRaids])

  // Lock body scroll while the mobile sidebar drawer is open.
  useEffect(() => {
    if (!drawerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [drawerOpen])

  useEffect(() => {
    if (xlsxForm.server || importServerOptions.length === 0) return
    setXlsxForm((form) => ({ ...form, server: importServerOptions[0].value }))
  }, [importServerOptions, xlsxForm.server])

  // ── Player form ────────────────────────────────────────────────────────────
  const emptyP = { ign: '', username: '', favouriteStudent: 'Hoshino', favouriteStudentId: '', joinedDate: '', club: 'Guest', clubId: '', userID: '' }
  const [pForm, setPForm] = useState(emptyP)
  const [isGuest, setIsGuest] = useState(true)

  function openAddPlayer() {
    const firstStudent = students[0]
    setPForm({
      ...emptyP,
      favouriteStudent: firstStudent?.name || 'Hoshino',
      favouriteStudentId: firstStudent ? String(firstStudent.id) : '',
    })
    setIsGuest(true); setEditTarget(null); setModal('player')
  }
  function openEditPlayer(p: Player) {
    const guest = !p.isGuildMember
    setPForm({
      ign: p.ign,
      username: p.username,
      favouriteStudent: p.favouriteStudentData?.name || p.favouriteStudent || 'Hoshino',
      favouriteStudentId: p.favouriteStudentId ? String(p.favouriteStudentId) : '',
      joinedDate: p.joinedDate ? p.joinedDate.split('T')[0] : '',
      club: p.clubData?.name || p.club || 'Guest',
      clubId: p.clubId || p.clubData?.id || '',
      userID: p.userID || '',
    })
    setIsGuest(guest); setEditTarget(p); setModal('player')
  }
  async function deletePlayer(id: string) {
    await fetch(`/api/admin/players/${id}`, { method: 'DELETE' }); loadPlayers(); showToast('Player deleted.')
  }
  async function savePlayer(e: React.FormEvent) {
    e.preventDefault()
    const payload = isGuest
      ? { ...pForm, club: 'Guest', clubId: '', isGuildMember: false }
      : { ...pForm, isGuildMember: true }
    const res = editTarget
      ? await fetch(`/api/admin/players/${(editTarget as Player).id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/admin/players', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Could not save player.' }))
      showToast(body.error || 'Could not save player.')
      return
    }
    showToast(editTarget ? 'Player updated.' : 'Player added.')
    setModal(null); loadPlayers(); loadClubs()
  }

  // ── Club form ──────────────────────────────────────────────────────────────
  const emptyC = { name: '', uid: '', logo: '', color: '#4f8ef7' }
  const [cForm, setCForm] = useState(emptyC)

  function openAddClub() { setCForm(emptyC); setEditTarget(null); setModal('club') }
  function openEditClub(c: Club) {
    setCForm({ name: c.name, uid: c.uid || '', logo: c.logo || '', color: c.color || '#4f8ef7' })
    setEditTarget(c); setModal('club')
  }
  async function deleteClub(id: string) {
    const res = await fetch(`/api/admin/clubs/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Could not delete club.' }))
      showToast(body.error || 'Could not delete club.')
      return
    }
    loadClubs(); loadPlayers(); showToast('Club deleted.')
  }
  async function saveClub(e: React.FormEvent) {
    e.preventDefault()
    const payload = { name: cForm.name, uid: cForm.uid, logo: cForm.logo, color: cForm.color }
    const res = editTarget
      ? await fetch(`/api/admin/clubs/${(editTarget as Club).id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/admin/clubs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Could not save club.' }))
      showToast(body.error || 'Could not save club.')
      return
    }
    showToast(editTarget ? 'Club updated.' : 'Club added.')
    setModal(null); loadClubs(); loadPlayers()
  }

  // ── Student form/import ─────────────────────────────────────────────────────
  const emptyS = {
    id: '',
    name: '',
    image: '',
    portrait: '',
    memorial: '',
    familyName: '',
    personalName: '',
    school: '',
    club: '',
    schoolYear: '',
    characterAge: '',
    birthday: '',
    birthDay: '',
    hobby: '',
    heightMetric: '',
    weaponType: '',
    tacticRole: '',
    position: '',
    weaponName: '',
    accentColor: '',
    memorialOffsetX: '-7.6',
    memorialOffsetY: '0',
    memorialScale: '0.5',
    portraitOffsetX: '0',
    portraitOffsetY: '0',
    portraitScale: '1',
  }
  const [sForm, setSForm] = useState(emptyS)

  function openAddStudent() { setSForm(emptyS); setEditTarget(null); setModal('student') }
  function openEditStudent(s: Student) {
    setSForm({
      id: String(s.id),
      name: s.name,
      image: s.image,
      portrait: s.portrait || '',
      memorial: s.memorial || '',
      familyName: s.familyName || '',
      personalName: s.personalName || '',
      school: s.school || '',
      club: s.club || '',
      schoolYear: s.schoolYear || '',
      characterAge: s.characterAge || '',
      birthday: s.birthday || '',
      birthDay: s.birthDay || '',
      hobby: s.hobby || '',
      heightMetric: s.heightMetric || '',
      weaponType: s.weaponType || '',
      tacticRole: s.tacticRole || '',
      position: s.position || '',
      weaponName: s.weaponName || '',
      accentColor: s.accentColor || '',
      memorialOffsetX: String(s.memorialOffsetX ?? -7.6),
      memorialOffsetY: String(s.memorialOffsetY ?? 0),
      memorialScale: String(s.memorialScale ?? 0.5),
      portraitOffsetX: String(s.portraitOffsetX ?? 0),
      portraitOffsetY: String(s.portraitOffsetY ?? 0),
      portraitScale: String(s.portraitScale ?? 1),
    })
    setEditTarget(s); setModal('student')
  }
  async function deleteStudent(id: number) {
    await fetch(`/api/admin/students/${id}`, { method: 'DELETE' })
    loadStudents(); loadPlayers(); showToast('Student deleted.')
  }
  async function saveStudent(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      id: Number(sForm.id),
      name: sForm.name,
      image: sForm.image,
      portrait: sForm.portrait,
      memorial: sForm.memorial,
      familyName: sForm.familyName,
      personalName: sForm.personalName,
      school: sForm.school,
      club: sForm.club,
      schoolYear: sForm.schoolYear,
      characterAge: sForm.characterAge,
      birthday: sForm.birthday,
      birthDay: sForm.birthDay,
      hobby: sForm.hobby,
      heightMetric: sForm.heightMetric,
      weaponType: sForm.weaponType,
      tacticRole: sForm.tacticRole,
      position: sForm.position,
      weaponName: sForm.weaponName,
      accentColor: sForm.accentColor,
      memorialOffsetX: Number(sForm.memorialOffsetX),
      memorialOffsetY: Number(sForm.memorialOffsetY),
      memorialScale: Number(sForm.memorialScale),
      portraitOffsetX: Number(sForm.portraitOffsetX),
      portraitOffsetY: Number(sForm.portraitOffsetY),
      portraitScale: Number(sForm.portraitScale),
    }
    const res = editTarget
      ? await fetch(`/api/admin/students/${(editTarget as Student).id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/admin/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Could not save student.' }))
      showToast(body.error || 'Could not save student.')
      return
    }
    showToast(editTarget ? 'Student updated.' : 'Student added.')
    setModal(null); loadStudents(); loadPlayers()
  }
  async function startStudentImport() {
    const res = await fetch('/api/admin/students/import', { method: 'POST' })
    const body = await res.json().catch(() => null)
    if (res.status === 409) {
      alert('Student import is already running. Please wait until it finishes.')
      if (body?.state) setImportState(body.state)
      setShowImportProgress(true)
      return
    }
    if (!res.ok) {
      showToast(body?.error || 'Could not start student import.')
      return
    }
    setImportState(body)
    setShowImportProgress(true)
    showToast('Student import started.')
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
  async function startRaidBossImport() {
    const res = await fetch('/api/admin/raid-bosses/import', { method: 'POST' })
    const body = await res.json().catch(() => null)
    if (res.status === 409) {
      alert('Raid boss import is already running. Please wait until it finishes.')
      if (body?.state) setBossImportState(body.state)
      setShowBossImportProgress(true)
      return
    }
    if (!res.ok) {
      showToast(body?.error || 'Could not start raid boss import.')
      return
    }
    setBossImportState(body)
    setShowBossImportProgress(true)
    showToast('Raid boss import started.')
  }

  // ── Raid form ──────────────────────────────────────────────────────────────
  const emptyR = {
    raidBossId: '', season: '3',
    typeId: '', serverId: '', terrainId: '',
    startDate: '', endDate: '',
  }
  const [rForm, setRForm] = useState(emptyR)

  function openAddRaid() {
    setRForm({ ...emptyR, raidBossId: bosses[0]?.id || '', typeId: raidTypes[0]?.id || '', serverId: raidServers[0]?.id || '', terrainId: raidTerrains[0]?.id || '' })
    setEditTarget(null); setModal('raid')
  }
  function openEditRaid(r: Raid) {
    setRForm({
      raidBossId: r.raidBossId,
      season: String(r.season),
      typeId: r.typeId,
      serverId: r.serverId,
      terrainId: r.terrainId,
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

  const loadXlsxImportProgress = useCallback(() => {
    fetch('/api/admin/import/xlsx/status')
      .then((r) => r.json())
      .then(setXlsxImportProgress)
      .catch(() => null)
  }, [])

  useEffect(() => {
    if (!xlsxImporting) return
    loadXlsxImportProgress()
    const timer = window.setInterval(loadXlsxImportProgress, 1000)
    return () => window.clearInterval(timer)
  }, [loadXlsxImportProgress, xlsxImporting])

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

  // ── XLSX import ────────────────────────────────────────────────────────────
  async function submitXlsxImport(e: React.FormEvent) {
    e.preventDefault()
    if (!xlsxFile) {
      showToast('Choose an XLSX file first.')
      return
    }

    setXlsxImporting(true)
    setXlsxImportResult(null)
    setXlsxImportProgress({
      status: 'running',
      stage: 'Uploading workbook',
      total: 0,
      processed: 0,
      rowsImported: 0,
      playersCreated: 0,
      playersUpdated: 0,
      entriesCreated: 0,
      entriesUpdated: 0,
    })
    const form = new FormData()
    form.append('file', xlsxFile)
    form.append('server', xlsxForm.server)
    form.append('startDate', xlsxForm.startDate)
    form.append('endDate', xlsxForm.endDate)

    const res = await fetch('/api/admin/import/xlsx', { method: 'POST', body: form })
    const body = await res.json().catch(() => null)
    setXlsxImporting(false)
    loadXlsxImportProgress()

    if (!res.ok) {
      showToast(body?.error || 'Could not import XLSX.')
      return
    }

    setXlsxImportResult(body)
    showToast('XLSX import completed.')
    loadPlayers(); loadClubs(); loadRaids(); loadBosses(); loadEntries(); loadRaidLookups()
  }

  const latestRaidCount = raids.filter(r => r.isActive).length
  const currentNav = navItems.find((n) => n.id === sec)
  const normalizedSearch = {
    activity: search.activity.trim().toLowerCase(),
    players: search.players.trim().toLowerCase(),
    clubs: search.clubs.trim().toLowerCase(),
    students: search.students.trim().toLowerCase(),
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
    p.ign, p.username, p.favouriteStudentData?.name, p.favouriteStudent, playerClubName(p), p.clubID, p.userID, p.isGuildMember ? 'guild' : 'guest',
  ], normalizedSearch.players))
  const filteredClubs = clubs.filter((c) => searchable([
    c.name, c.uid, c.logo, c.color, c._count?.players,
  ], normalizedSearch.clubs))
  const filteredStudents = students.filter((s) => searchable([
    s.id, s.name, s.image, s.portrait, s.memorial,
    s.familyName, s.personalName, s.school, s.club, s.schoolYear, s.characterAge,
    s.birthday, s.birthDay, s.hobby, s.heightMetric, s.weaponType, s.tacticRole, s.position, s.weaponName, s.accentColor,
    s.memorialOffsetX, s.memorialOffsetY, s.memorialScale,
    s.portraitOffsetX, s.portraitOffsetY, s.portraitScale,
  ], normalizedSearch.students))
  const filteredRaids = raids.filter((r) => searchable([
    r.raidBoss.name, r.raidBoss.description, r.season, r.type.name, r.server.name, r.terrain.name,
    r.pattern, r.startDate, r.endDate,
  ], normalizedSearch.raids))
  const filteredBosses = bosses.filter((b) => searchable([
    b.schaleId, b.name, b.description, b.image, b.color, b.color2, b.pattern,
  ], normalizedSearch.bosses))
  const filteredEntries = entries.filter((e) => searchable([
    e.player.ign, e.player.username, e.player.club, e.player.clubID, e.player.userID,
    e.raid.raidBoss.name, e.raid.season, e.raid.type.name, e.raid.server.name, e.raid.terrain.name,
    e.score, e.createdAt,
  ], normalizedSearch.entries))
  const filteredActivity = entries.filter((e) => searchable([
    e.player.ign, e.player.username, e.raid.raidBoss.name, e.raid.season, e.raid.server.name, e.raid.terrain.name,
    e.score, e.createdAt,
  ], normalizedSearch.activity))

  const visibleActivity = filteredActivity.slice(0, visibleRows.activity)
  const visiblePlayers = filteredPlayers.slice(0, visibleRows.players)
  const visibleClubs = filteredClubs.slice(0, visibleRows.clubs)
  const visibleStudents = filteredStudents.slice(0, visibleRows.students)
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
            <line x1="4" y1="7" x2="20" y2="7" />
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
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 md:w-48 md:shrink-0 bg-bg md:border-r md:border-border py-5 md:py-5 overflow-y-auto transition-transform duration-200 ease-out border-r border-border ${drawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
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
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors border-l-2 font-sans ${sec === n.id
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {[
                { l: 'Total Players', v: players.length, c: 'var(--accent)' },
                { l: 'Clubs', v: clubs.length, c: 'var(--gold)' },
                { l: 'Latest Raids', v: latestRaidCount, c: 'var(--green)' },
                { l: 'Total Entries', v: entries.length, c: '#a78bfa' },
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
                  className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 py-2 ${i < visibleActivity.length - 1 ? 'border-b border-border' : ''
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
                      <div className="text-muted2">{p.favouriteStudentData?.name || p.favouriteStudent || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted tracking-[0.06em] uppercase">Club</div>
                      <div>{playerClubName(p)}</div>
                      <div className="text-[10px] text-muted font-mono">
                        {p.clubID || (playerClubName(p) === 'Guest' ? 'GUEST' : '—')}
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
                      {['IGN', 'USERNAME', 'FAV STUDENT', 'CLUB / ID', 'USER ID', 'ACTIONS'].map((h) => (
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
                        <td className="px-3.5 py-2.5 text-muted2 text-[13px]">{p.favouriteStudentData?.name || p.favouriteStudent || '—'}</td>
                        <td className="px-3.5 py-2.5">
                          <div className="text-[13px]">{playerClubName(p)}</div>
                          <div className="text-[11px] text-muted font-mono">{p.clubID || (playerClubName(p) === 'Guest' ? 'GUEST' : '—')}</div>
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

        {/* CLUBS */}
        {sec === 'clubs' && (
          <div>
            <div className="flex justify-between items-center gap-3 mb-5">
              <div className="font-bold text-lg">
                Clubs <span className="text-[13px] text-muted font-normal">({clubs.length})</span>
              </div>
              <button onClick={openAddClub} className={addBtnClass}>+ Add Club</button>
            </div>
            {renderListControls('clubs', clubs.length, filteredClubs.length, visibleClubs.length, 'Search clubs by name, UID, color, logo path, or player count...')}

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-border2 bg-white/[0.02]">
                      {['LOGO', 'NAME', 'UID', 'COLOR', 'PLAYERS', 'ACTIONS'].map((h) => (
                        <th key={h} className="px-3.5 py-2.5 text-left text-muted text-[11px] font-semibold tracking-[0.07em] whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleClubs.map((c, i) => (
                      <tr key={c.id} className={i < visibleClubs.length - 1 ? 'border-b border-border' : ''}>
                        <td className="px-3.5 py-2.5">
                          {c.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imageSrc(c.logo)}
                              alt={c.name}
                              className="w-9 h-9 rounded-lg object-cover border border-border"
                              onError={e => (e.currentTarget.style.display = 'none')}
                            />
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold whitespace-nowrap">{c.name}</td>
                        <td className="px-3.5 py-2.5 font-mono text-xs text-muted2 whitespace-nowrap">{c.uid || '—'}</td>
                        <td className="px-3.5 py-2.5 font-mono text-xs text-muted2 whitespace-nowrap">
                          <span className={colorSwatchClass} style={{ backgroundColor: c.color }} /> {c.color}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-muted2">{c._count?.players || 0}</td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex gap-1.5">
                            <button onClick={() => openEditClub(c)} className={editBtnClass}>Edit</button>
                            <button onClick={() => deleteClub(c.id)} className={delBtnClass}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredClubs.length === 0 && (
                  <div className="text-center text-muted text-sm py-8">
                    {clubs.length === 0 ? 'No clubs yet.' : 'No clubs match your search.'}
                  </div>
                )}
              </div>
            </div>
            {renderShowMore('clubs', filteredClubs.length, visibleClubs.length)}
          </div>
        )}

        {/* STUDENTS */}
        {sec === 'students' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5">
              <div className="font-bold text-lg">
                Students <span className="text-[13px] text-muted font-normal">({students.length})</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button onClick={startStudentImport} className={addBtnClass}>Import / Update from SchaleDB</button>
                <button onClick={openAddStudent} className={addBtnClass}>+ Add Student</button>
              </div>
            </div>
            {importState?.status === 'running' && (
              <div className="mb-3 bg-accent/[0.08] border border-accent/25 rounded-xl px-4 py-3 text-[13px] text-muted2">
                Import running: {importState.processed.toLocaleString()} / {importState.total ? importState.total.toLocaleString() : '...'} processed
              </div>
            )}
            {renderListControls('students', students.length, filteredStudents.length, visibleStudents.length, 'Search students by id, name, birthday, school, or media URLs...')}

            {/* Card list (mobile) */}
            <div className="sm:hidden flex flex-col gap-2.5">
              {visibleStudents.map((s) => (
                <div key={s.id} className="bg-card border border-border rounded-xl p-3.5">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proxyImage(s.image)}
                        alt={s.name}
                        className="w-12 h-12 rounded-lg object-cover border border-border shrink-0"
                        onError={e => (e.currentTarget.style.display = 'none')}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm break-words">{s.name}</div>
                        <div className="text-[11px] text-muted font-mono">ID {s.id}</div>
                        <div className="text-[11px] text-muted truncate max-w-[180px]">
                          {s.birthDay || 'No birthday'} · {s.school || 'No school'}{s.club ? ` / ${s.club}` : ''}
                        </div>
                        <div className="text-[11px] text-muted truncate max-w-[180px]">
                          Accent: {s.accentColor ? 'sampled' : 'pending'}
                        </div>
                        <div className="text-[11px] text-muted truncate max-w-[180px]">
                          Portrait: {s.portrait ? 'set' : '—'} · Memorial video: {s.memorial ? 'set' : '—'}
                        </div>
                        <div className="text-[11px] text-muted font-mono">
                          P {s.portraitOffsetX}, {s.portraitOffsetY} · {s.portraitScale}x
                        </div>
                        <div className="text-[11px] text-muted font-mono">
                          M {s.memorialOffsetX}, {s.memorialOffsetY} · {s.memorialScale}x
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => openEditStudent(s)} className={editBtnClass}>Edit</button>
                      <button onClick={() => deleteStudent(s.id)} className={delBtnClass}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredStudents.length === 0 && (
                <div className="text-center text-muted text-sm py-8">
                  {students.length === 0 ? 'No students yet.' : 'No students match your search.'}
                </div>
              )}
            </div>

            {/* Table (sm+) */}
            <div className="hidden sm:block bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-border2 bg-white/[0.02]">
                      {['IMAGE', 'PORTRAIT', 'ID', 'NAME', 'BIRTHDAY', 'ACCENT', 'SCHOOL / CLUB', 'WEAPON / ROLE', 'PORTRAIT OFFSET', 'MEMORIAL OFFSET', 'IMAGE URL', 'MEMORIAL VIDEO', 'ACTIONS'].map((h) => (
                        <th key={h} className="px-3.5 py-2.5 text-left text-muted text-[11px] font-semibold tracking-[0.07em] whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStudents.map((s, i) => (
                      <tr key={s.id} className={i < visibleStudents.length - 1 ? 'border-b border-border' : ''}>
                        <td className="px-3.5 py-2.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={proxyImage(s.image)}
                            alt={s.name}
                            className="w-11 h-11 rounded-lg object-cover border border-border"
                            onError={e => (e.currentTarget.style.display = 'none')}
                          />
                        </td>
                        <td className="px-3.5 py-2.5">
                          {s.portrait ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={proxyImage(s.portrait)}
                              alt={`${s.name} portrait`}
                              className="w-11 h-11 rounded-lg object-cover border border-border"
                              onError={e => (e.currentTarget.style.display = 'none')}
                            />
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-xs text-muted2 whitespace-nowrap">{s.id}</td>
                        <td className="px-3.5 py-2.5 font-semibold whitespace-nowrap">{s.name}</td>
                        <td className="px-3.5 py-2.5 text-muted2 text-xs whitespace-nowrap">{s.birthDay || s.birthday || '—'}</td>
                        <td className="px-3.5 py-2.5 text-muted2 text-xs whitespace-nowrap">{s.accentColor || '—'}</td>
                        <td className="px-3.5 py-2.5 text-muted2 text-xs whitespace-nowrap">
                          {s.school || '—'}{s.club ? ` / ${s.club}` : ''}
                        </td>
                        <td className="px-3.5 py-2.5 text-muted2 text-xs whitespace-nowrap">
                          {s.weaponType || '—'}{s.tacticRole ? ` / ${s.tacticRole}` : ''}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-xs text-muted2 whitespace-nowrap">
                          {s.portraitOffsetX}, {s.portraitOffsetY} · {s.portraitScale}x
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-xs text-muted2 whitespace-nowrap">
                          {s.memorialOffsetX}, {s.memorialOffsetY} · {s.memorialScale}x
                        </td>
                        <td className="px-3.5 py-2.5 text-muted text-xs max-w-[360px] truncate">{s.image}</td>
                        <td className="px-3.5 py-2.5 text-muted text-xs max-w-[360px] truncate">{s.memorial || '—'}</td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex gap-1.5">
                            <button onClick={() => openEditStudent(s)} className={editBtnClass}>Edit</button>
                            <button onClick={() => deleteStudent(s.id)} className={delBtnClass}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredStudents.length === 0 && (
                  <div className="text-center text-muted text-sm py-8">
                    {students.length === 0 ? 'No students yet.' : 'No students match your search.'}
                  </div>
                )}
              </div>
            </div>
            {renderShowMore('students', filteredStudents.length, visibleStudents.length)}
          </div>
        )}

        {/* RAIDS */}
        {sec === 'raids' && (
          <div>
            <div className="flex justify-between items-center gap-3 mb-5">
              <div className="font-bold text-lg">Raids</div>
              <button onClick={openAddRaid} className={addBtnClass}>+ Add Raid</button>
            </div>
            {renderListControls('raids', raids.length, filteredRaids.length, visibleRaids.length, 'Search raids by boss, season, type, terrain, server, or date...')}
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
                        <span className="text-xs text-muted">S{r.season} · {r.type.name} · {r.terrain.name}</span>
                        <ServerBadge server={r.server.name} />
                        {r.isActive && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green/15 text-green border border-green/35">
                            LATEST
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
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5">
              <div className="font-bold text-lg">
                Raid Bosses <span className="text-[13px] text-muted font-normal">({bosses.length})</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button onClick={startRaidBossImport} className={addBtnClass}>Import / Update from SchaleDB</button>
                <button onClick={openAddBoss} className={addBtnClass}>+ Add Boss</button>
              </div>
            </div>
            {bossImportState?.status === 'running' && (
              <div className="mb-3 bg-accent/[0.08] border border-accent/25 rounded-xl px-4 py-3 text-[13px] text-muted2">
                Import running: {bossImportState.processed.toLocaleString()} / {bossImportState.total ? bossImportState.total.toLocaleString() : '...'} processed
              </div>
            )}
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-bold text-sm break-words">{b.name}</div>
                        {b.schaleId && (
                          <span className="text-[10px] text-muted font-mono border border-border rounded px-1.5 py-px">
                            ID {b.schaleId}
                          </span>
                        )}
                      </div>
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
            {renderListControls('entries', entries.length, filteredEntries.length, visibleEntries.length, 'Search entries by player, raid, terrain, server, score, or date...')}

            {/* Card list (mobile) */}
            <div className="sm:hidden flex flex-col gap-2.5">
              {visibleEntries.map((e) => (
                <div key={e.id} className="bg-card border border-border rounded-xl p-3.5">
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm break-words">{e.player.ign}</div>
                      <div className="text-[11px] text-muted2 mt-0.5 break-words">
                        {e.raid.raidBoss.name} S{e.raid.season} · {e.raid.terrain.name}
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
                      {['PLAYER', 'RAID', 'SERVER', 'SCORE', 'DATE', 'ACTIONS'].map((h) => (
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
                        <td className="px-3.5 py-2.5 text-muted2">{e.raid.raidBoss.name} S{e.raid.season} · {e.raid.terrain.name}</td>
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

        {/* IMPORT */}
        {sec === 'import' && (
          <div>
            <div className="mb-5">
              <div className="font-bold text-lg">Import</div>
              <div className="text-[13px] text-muted mt-1">
                Upload a Global XLSX with Members and Guests sheets, or a JP XLSX with ign, Score, Club, Rank, and Favorite Student columns.
                Filename format: Total Assault S74_ Gregorius Indoor.xlsx or (JP) Score Submission - Total Assault S85_ Wakaboat Outdoor.xlsx.
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl px-4 py-4 sm:px-5 sm:py-5">
              <form onSubmit={submitXlsxImport}>
                <StField label="XLSX FILE" span2>
                  <input
                    className={inputClass}
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => setXlsxFile(e.target.files?.[0] || null)}
                    required
                  />
                </StField>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4">
                  <StField label="SERVER">
                    <select
                      className={inputClass}
                      value={xlsxForm.server}
                      onChange={(e) => setXlsxForm((form) => ({ ...form, server: e.target.value }))}
                      required
                    >
                      <option value="">— Select Server —</option>
                      {importServerOptions.map(s => <option key={s.key} value={s.value}>{s.label}</option>)}
                    </select>
                  </StField>
                  <StField label="START DATE">
                    <input
                      className={inputClass}
                      type="date"
                      value={xlsxForm.startDate}
                      onChange={(e) => setXlsxForm((form) => ({ ...form, startDate: e.target.value }))}
                      required
                    />
                  </StField>
                  <StField label="END DATE">
                    <input
                      className={inputClass}
                      type="date"
                      value={xlsxForm.endDate}
                      onChange={(e) => setXlsxForm((form) => ({ ...form, endDate: e.target.value }))}
                      required
                    />
                  </StField>
                </div>
                <button type="submit" className={submitBtnClass} disabled={xlsxImporting}>
                  {xlsxImporting ? 'Importing...' : 'Import XLSX'}
                </button>
              </form>
            </div>

            {(xlsxImporting || xlsxImportProgress?.status === 'running') && (
              <div className="mt-4 bg-card border border-border rounded-xl px-4 py-4 sm:px-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div>
                    <div className="font-bold text-[15px]">Importing XLSX</div>
                    <div className="text-xs text-muted">
                      {xlsxImportProgress?.stage || 'Working'}{xlsxImportProgress?.currentSheet ? ` · ${xlsxImportProgress.currentSheet} row ${xlsxImportProgress.currentRow || ''}` : ''}
                    </div>
                  </div>
                  <div className="font-mono text-sm text-muted2">
                    {xlsxImportProgress?.total
                      ? `${xlsxImportProgress.processed} / ${xlsxImportProgress.total}`
                      : `${xlsxImportProgress?.processed || 0} rows`}
                  </div>
                </div>
                <div className="h-2.5 rounded-full bg-bg border border-border overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{
                      width: `${xlsxImportProgress?.total
                        ? Math.min(100, Math.round((xlsxImportProgress.processed / xlsxImportProgress.total) * 100))
                        : 8}%`,
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
                  {[
                    ['Imported', xlsxImportProgress?.rowsImported || 0],
                    ['Players +', xlsxImportProgress?.playersCreated || 0],
                    ['Players ~', xlsxImportProgress?.playersUpdated || 0],
                    ['Entries', (xlsxImportProgress?.entriesCreated || 0) + (xlsxImportProgress?.entriesUpdated || 0)],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-card2 border border-border rounded-lg p-2.5">
                      <div className="text-[10px] text-muted tracking-[0.08em] font-semibold uppercase">{label}</div>
                      <div className="font-mono text-base text-text font-bold">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {xlsxImportResult && (
              <div className="mt-4 bg-card border border-border rounded-xl px-4 py-4 sm:px-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <div>
                    <div className="font-bold text-[15px]">{xlsxImportResult.raid.title}</div>
                    <div className="text-xs text-muted">
                      Raid {xlsxImportResult.raid.created ? 'created' : 'reused'} · {xlsxImportResult.rowsImported} of {xlsxImportResult.rowsRead} rows imported
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    ['Players Created', xlsxImportResult.playersCreated],
                    ['Players Updated', xlsxImportResult.playersUpdated],
                    ['Clubs Created', xlsxImportResult.clubsCreated],
                    ['Clubs Reused', xlsxImportResult.clubsReused],
                    ['Entries Created', xlsxImportResult.entriesCreated],
                    ['Entries Updated', xlsxImportResult.entriesUpdated],
                    ['Skipped Rows', xlsxImportResult.skippedRows.length],
                    ['Unmatched Fav', xlsxImportResult.unmatchedFavoriteStudents.length],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-card2 border border-border rounded-lg p-3">
                      <div className="text-[10px] text-muted tracking-[0.08em] font-semibold uppercase">{label}</div>
                      <div className="font-mono text-lg text-text font-bold">{value}</div>
                    </div>
                  ))}
                </div>
                {xlsxImportResult.unmatchedFavoriteStudents.length > 0 && (
                  <div className="mt-4 bg-bg border border-border rounded-lg p-3">
                    <div className="text-[11px] font-semibold text-muted tracking-[0.08em] mb-2">UNMATCHED FAVORITE STUDENTS</div>
                    <div className="text-xs text-muted2 break-words">
                      {xlsxImportResult.unmatchedFavoriteStudents.join(', ')}
                    </div>
                  </div>
                )}
                {xlsxImportResult.skippedRows.length > 0 && (
                  <div className="mt-3 bg-bg border border-border rounded-lg p-3">
                    <div className="text-[11px] font-semibold text-muted tracking-[0.08em] mb-2">SKIPPED ROWS</div>
                    <div className="space-y-1 text-xs text-muted2">
                      {xlsxImportResult.skippedRows.slice(0, 8).map((row) => (
                        <div key={row.row}>Row {row.row}: {row.reason}</div>
                      ))}
                      {xlsxImportResult.skippedRows.length > 8 && (
                        <div>+ {xlsxImportResult.skippedRows.length - 8} more</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
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
                <select
                  className={inputClass}
                  value={pForm.favouriteStudentId}
                  onChange={e => {
                    const student = students.find(s => String(s.id) === e.target.value)
                    setPForm(f => ({
                      ...f,
                      favouriteStudentId: e.target.value,
                      favouriteStudent: student?.name || f.favouriteStudent,
                    }))
                  }}
                >
                  <option value="">— Select Student —</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                onClick={() => {
                  const next = !isGuest
                  setIsGuest(next)
                  if (next) {
                    setPForm(f => ({ ...f, clubId: '', club: 'Guest' }))
                  } else if (!pForm.clubId && clubs[0]) {
                    setPForm(f => ({ ...f, clubId: clubs[0].id, club: clubs[0].name }))
                  }
                }}
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
                  <select
                    className={inputClass}
                    value={pForm.clubId}
                    onChange={e => {
                      const club = clubs.find(c => c.id === e.target.value)
                      setPForm(f => ({ ...f, clubId: e.target.value, club: club?.name || '' }))
                    }}
                    required
                  >
                    <option value="">— Select Club —</option>
                    {clubs.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.uid ? ` (${c.uid})` : ''}
                      </option>
                    ))}
                  </select>
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

      {/* Club modal */}
      {modal === 'club' && (
        <StModal title={editTarget ? 'Edit Club' : 'Add Club'} onClose={() => setModal(null)} extraWide>
          <form onSubmit={saveClub}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <StField label="CLUB NAME">
                <input
                  className={inputClass}
                  type="text"
                  value={cForm.name}
                  onChange={e => setCForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Club name"
                  required
                />
              </StField>
              <StField label="UID">
                <input
                  className={inputClass}
                  type="text"
                  value={cForm.uid}
                  onChange={e => setCForm(f => ({ ...f, uid: e.target.value }))}
                  placeholder="Optional UID"
                />
              </StField>
              <StField label="COLOR">
                <input
                  className={`${inputClass} h-11`}
                  type="color"
                  value={cForm.color}
                  onChange={e => setCForm(f => ({ ...f, color: e.target.value }))}
                />
              </StField>
            </div>
            <StField label="LOGO PATH OR URL" span2>
              <input
                className={inputClass}
                type="text"
                value={cForm.logo}
                onChange={e => setCForm(f => ({ ...f, logo: e.target.value }))}
                placeholder="/assets/clubs/Gehenna.png or https://..."
              />
            </StField>
            {cForm.logo && (
              <div className="mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc(cForm.logo)}
                  alt="Preview"
                  className="h-16 w-16 rounded-xl border border-border object-cover"
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
              </div>
            )}
            <button type="submit" className={submitBtnClass}>
              {editTarget ? 'Save Changes' : 'Add Club'}
            </button>
          </form>
        </StModal>
      )}

      {/* Student modal */}
      {modal === 'student' && (
        <StModal title={editTarget ? 'Edit Student' : 'Add Student'} onClose={() => setModal(null)} extraWide>
          <form onSubmit={saveStudent}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <StField label="STUDENT ID">
                <input
                  className={inputClass}
                  type="number"
                  min="1"
                  value={sForm.id}
                  onChange={e => setSForm(f => ({ ...f, id: e.target.value }))}
                  placeholder="e.g. 10000"
                  disabled={Boolean(editTarget)}
                  required
                />
              </StField>
              <StField label="NAME">
                <input
                  className={inputClass}
                  type="text"
                  value={sForm.name}
                  onChange={e => setSForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Student name"
                  required
                />
              </StField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <StField label="FAMILY NAME">
                <input
                  className={inputClass}
                  type="text"
                  value={sForm.familyName}
                  onChange={e => setSForm(f => ({ ...f, familyName: e.target.value }))}
                  placeholder="e.g. Hayase"
                />
              </StField>
              <StField label="PERSONAL NAME">
                <input
                  className={inputClass}
                  type="text"
                  value={sForm.personalName}
                  onChange={e => setSForm(f => ({ ...f, personalName: e.target.value }))}
                  placeholder="e.g. Yuuka"
                />
              </StField>
              <StField label="BIRTHDAY DISPLAY">
                <input
                  className={inputClass}
                  type="text"
                  value={sForm.birthday}
                  onChange={e => setSForm(f => ({ ...f, birthday: e.target.value }))}
                  placeholder="e.g. March 14th"
                />
              </StField>
              <StField label="BIRTHDAY KEY">
                <input
                  className={inputClass}
                  type="text"
                  value={sForm.birthDay}
                  onChange={e => setSForm(f => ({ ...f, birthDay: e.target.value }))}
                  placeholder="M/D, e.g. 3/14"
                />
              </StField>
              <StField label="SCHOOL">
                <input
                  className={inputClass}
                  type="text"
                  value={sForm.school}
                  onChange={e => setSForm(f => ({ ...f, school: e.target.value }))}
                  placeholder="e.g. Millennium"
                />
              </StField>
              <StField label="CLUB">
                <input
                  className={inputClass}
                  type="text"
                  value={sForm.club}
                  onChange={e => setSForm(f => ({ ...f, club: e.target.value }))}
                  placeholder="e.g. TheSeminar"
                />
              </StField>
              <StField label="SCHOOL YEAR">
                <input
                  className={inputClass}
                  type="text"
                  value={sForm.schoolYear}
                  onChange={e => setSForm(f => ({ ...f, schoolYear: e.target.value }))}
                  placeholder="e.g. 2nd Year"
                />
              </StField>
              <StField label="AGE">
                <input
                  className={inputClass}
                  type="text"
                  value={sForm.characterAge}
                  onChange={e => setSForm(f => ({ ...f, characterAge: e.target.value }))}
                  placeholder="e.g. 16 years old"
                />
              </StField>
              <StField label="HEIGHT">
                <input
                  className={inputClass}
                  type="text"
                  value={sForm.heightMetric}
                  onChange={e => setSForm(f => ({ ...f, heightMetric: e.target.value }))}
                  placeholder="e.g. 156cm"
                />
              </StField>
              <StField label="HOBBY">
                <input
                  className={inputClass}
                  type="text"
                  value={sForm.hobby}
                  onChange={e => setSForm(f => ({ ...f, hobby: e.target.value }))}
                  placeholder="e.g. Doing calculations"
                />
              </StField>
              <StField label="WEAPON TYPE">
                <input
                  className={inputClass}
                  type="text"
                  value={sForm.weaponType}
                  onChange={e => setSForm(f => ({ ...f, weaponType: e.target.value }))}
                  placeholder="e.g. SMG"
                />
              </StField>
              <StField label="TACTIC ROLE">
                <input
                  className={inputClass}
                  type="text"
                  value={sForm.tacticRole}
                  onChange={e => setSForm(f => ({ ...f, tacticRole: e.target.value }))}
                  placeholder="e.g. Tanker"
                />
              </StField>
              <StField label="POSITION">
                <input
                  className={inputClass}
                  type="text"
                  value={sForm.position}
                  onChange={e => setSForm(f => ({ ...f, position: e.target.value }))}
                  placeholder="e.g. Front"
                />
              </StField>
              <StField label="WEAPON NAME">
                <input
                  className={inputClass}
                  type="text"
                  value={sForm.weaponName}
                  onChange={e => setSForm(f => ({ ...f, weaponName: e.target.value }))}
                  placeholder="e.g. Logic & Reason"
                />
              </StField>
              <StField label="ACCENT COLOR">
                <input
                  className={inputClass}
                  type="text"
                  value={sForm.accentColor}
                  onChange={e => setSForm(f => ({ ...f, accentColor: e.target.value }))}
                  placeholder="oklch(0.620 0.180 240.0)"
                />
              </StField>
            </div>
            <StField label="IMAGE URL" span2>
              <input
                className={inputClass}
                type="url"
                value={sForm.image}
                onChange={e => setSForm(f => ({ ...f, image: e.target.value }))}
                placeholder="https://schaledb.com/images/student/collection/10000.webp"
              />
            </StField>
            <StField label="PORTRAIT URL" span2>
              <input
                className={inputClass}
                type="url"
                value={sForm.portrait}
                onChange={e => setSForm(f => ({ ...f, portrait: e.target.value }))}
                placeholder="https://schaledb.com/images/student/portrait/10000.webp"
              />
            </StField>
            <StField label="MEMORIAL VIDEO" span2>
              <input
                className={inputClass}
                type="text"
                value={sForm.memorial}
                onChange={e => setSForm(f => ({ ...f, memorial: e.target.value }))}
                placeholder="/api/memorial-video?file=Blue%20Archive%20-%20Airi%20Live2D.mp4"
              />
            </StField>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4">
              <StField label="MEMORIAL X OFFSET">
                <input
                  className={inputClass}
                  type="number"
                  step="0.1"
                  value={sForm.memorialOffsetX}
                  onChange={e => setSForm(f => ({ ...f, memorialOffsetX: e.target.value }))}
                  placeholder="-7.6"
                />
              </StField>
              <StField label="MEMORIAL Y OFFSET">
                <input
                  className={inputClass}
                  type="number"
                  step="0.1"
                  value={sForm.memorialOffsetY}
                  onChange={e => setSForm(f => ({ ...f, memorialOffsetY: e.target.value }))}
                  placeholder="0"
                />
              </StField>
              <StField label="MEMORIAL SCALE">
                <input
                  className={inputClass}
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={sForm.memorialScale}
                  onChange={e => setSForm(f => ({ ...f, memorialScale: e.target.value }))}
                  placeholder="0.5"
                />
              </StField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4">
              <StField label="PORTRAIT X OFFSET">
                <input
                  className={inputClass}
                  type="number"
                  step="0.1"
                  value={sForm.portraitOffsetX}
                  onChange={e => setSForm(f => ({ ...f, portraitOffsetX: e.target.value }))}
                  placeholder="0"
                />
              </StField>
              <StField label="PORTRAIT Y OFFSET">
                <input
                  className={inputClass}
                  type="number"
                  step="0.1"
                  value={sForm.portraitOffsetY}
                  onChange={e => setSForm(f => ({ ...f, portraitOffsetY: e.target.value }))}
                  placeholder="0"
                />
              </StField>
              <StField label="PORTRAIT SCALE">
                <input
                  className={inputClass}
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={sForm.portraitScale}
                  onChange={e => setSForm(f => ({ ...f, portraitScale: e.target.value }))}
                  placeholder="1"
                />
              </StField>
            </div>
            {(sForm.image || sForm.portrait || sForm.memorial) && (
              <div className="mb-3 flex flex-wrap gap-3">
                {[
                  ['Image', sForm.image, 'image'],
                  ['Portrait', sForm.portrait, 'image'],
                  ['Memorial video', sForm.memorial, 'video'],
                ].filter((item): item is [string, string, string] => Boolean(item[1])).map(([label, src, kind]) => (
                  <div key={label}>
                    <div className="text-[10px] text-muted tracking-[0.06em] uppercase mb-1">{label}</div>
                    {kind === 'video' ? (
                      <video
                        src={imageSrc(src)}
                        muted
                        loop
                        playsInline
                        controls
                        className="h-24 w-24 rounded-xl border border-border object-cover"
                        onError={e => (e.currentTarget.style.display = 'none')}
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={proxyImage(src)}
                        alt={`${label} preview`}
                        className="h-24 w-24 rounded-xl border border-border object-cover"
                        onError={e => (e.currentTarget.style.display = 'none')}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            <button type="submit" className={submitBtnClass}>
              {editTarget ? 'Save Changes' : 'Add Student'}
            </button>
          </form>
        </StModal>
      )}

      {/* Student import progress */}
      {showImportProgress && importState && (
        <StModal
          title="Student Import"
          onClose={() => {
            if (importState.status !== 'running') setShowImportProgress(false)
          }}
        >
          <div className="space-y-4">
            <div className="text-sm text-muted2">
              {importState.status === 'running'
                ? importState.total > 0 ? 'Importing students from SchaleDB...' : 'Fetching student data from SchaleDB...'
                : importState.status === 'completed'
                  ? 'Student import completed.'
                  : importState.status === 'failed'
                    ? 'Student import failed.'
                    : 'Student import is idle.'}
            </div>
            <div>
              <div className="h-3 rounded-full bg-bg border border-border overflow-hidden">
                <div
                  className="h-full bg-accent transition-all"
                  style={{
                    width: `${importState.total > 0 ? Math.min(100, Math.round((importState.processed / importState.total) * 100)) : 8}%`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[12px] text-muted">
                <span>{importState.processed.toLocaleString()} / {importState.total ? importState.total.toLocaleString() : '...'} processed</span>
                <span>{importState.total > 0 ? `${Math.round((importState.processed / importState.total) * 100)}%` : 'Starting'}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-card2 border border-border rounded-xl p-3">
                <div className="text-[11px] text-muted tracking-[0.08em] font-semibold">ADDED</div>
                <div className="font-mono text-xl text-green font-bold">{importState.added.toLocaleString()}</div>
              </div>
              <div className="bg-card2 border border-border rounded-xl p-3">
                <div className="text-[11px] text-muted tracking-[0.08em] font-semibold">SKIPPED</div>
                <div className="font-mono text-xl text-muted2 font-bold">{importState.skipped.toLocaleString()}</div>
              </div>
            </div>
            {importState.error && (
              <div className="bg-red/10 border border-red/25 rounded-xl p-3 text-sm text-red">
                {importState.error}
              </div>
            )}
            {importState.status !== 'running' && (
              <button type="button" className={submitBtnClass} onClick={() => setShowImportProgress(false)}>
                Close
              </button>
            )}
          </div>
        </StModal>
      )}

      {/* Boss modal */}
      {modal === 'boss' && (
        <StModal title={editTarget ? 'Edit Raid Boss' : 'Add Raid Boss'} onClose={() => setModal(null)} extraWide>
          <form onSubmit={saveBoss}>
            <StField label="BOSS NAME" span2>
              <input className={inputClass} type="text" value={bForm.name} onChange={e => setBForm(f => ({ ...f, name: e.target.value }))} placeholder="Raid boss name" required />
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

      {/* Raid boss import progress */}
      {showBossImportProgress && bossImportState && (
        <StModal
          title="Raid Boss Import"
          onClose={() => {
            if (bossImportState.status !== 'running') setShowBossImportProgress(false)
          }}
        >
          <div className="space-y-4">
            <div className="text-sm text-muted2">
              {bossImportState.status === 'running'
                ? bossImportState.total > 0 ? 'Importing raid bosses from SchaleDB...' : 'Fetching raid data from SchaleDB...'
                : bossImportState.status === 'completed'
                  ? 'Raid boss import completed.'
                  : bossImportState.status === 'failed'
                    ? 'Raid boss import failed.'
                    : 'Raid boss import is idle.'}
            </div>
            <div>
              <div className="h-3 rounded-full bg-bg border border-border overflow-hidden">
                <div
                  className="h-full bg-accent transition-all"
                  style={{
                    width: `${bossImportState.total > 0 ? Math.min(100, Math.round((bossImportState.processed / bossImportState.total) * 100)) : 8}%`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[12px] text-muted">
                <span>{bossImportState.processed.toLocaleString()} / {bossImportState.total ? bossImportState.total.toLocaleString() : '...'} processed</span>
                <span>{bossImportState.total > 0 ? `${Math.round((bossImportState.processed / bossImportState.total) * 100)}%` : 'Starting'}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-card2 border border-border rounded-xl p-3">
                <div className="text-[11px] text-muted tracking-[0.08em] font-semibold">ADDED</div>
                <div className="font-mono text-xl text-green font-bold">{bossImportState.added.toLocaleString()}</div>
              </div>
              <div className="bg-card2 border border-border rounded-xl p-3">
                <div className="text-[11px] text-muted tracking-[0.08em] font-semibold">SKIPPED</div>
                <div className="font-mono text-xl text-muted2 font-bold">{bossImportState.skipped.toLocaleString()}</div>
              </div>
            </div>
            {bossImportState.error && (
              <div className="bg-red/10 border border-red/25 rounded-xl p-3 text-sm text-red">
                {bossImportState.error}
              </div>
            )}
            {bossImportState.status !== 'running' && (
              <button type="button" className={submitBtnClass} onClick={() => setShowBossImportProgress(false)}>
                Close
              </button>
            )}
          </div>
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
              <StField label="TERRAIN">
                <select className={inputClass} value={rForm.terrainId} onChange={e => setRForm(f => ({ ...f, terrainId: e.target.value }))} required>
                  <option value="">— Select Terrain —</option>
                  {raidTerrains.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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
                {raids.map(r => <option key={r.id} value={r.id}>{r.raidBoss.name} — S{r.season} {r.terrain.name} ({r.server.name})</option>)}
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
