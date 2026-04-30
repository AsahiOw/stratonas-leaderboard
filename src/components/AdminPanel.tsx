'use client'
import { useState, useEffect, useCallback } from 'react'
import { ServerBadge } from '@/components/ui/ServerBadge'
import { StModal } from '@/components/ui/StModal'
import { StField, inputStyle } from '@/components/ui/StField'
import { Toast } from '@/components/ui/Toast'
import { fmtDate } from '@/lib/utils'

const STUDENTS = ['Hoshino','Shiroko','Yuuka','Aris','Natsu','Hibiki','Kayoko','Neru','Haruna','Mutsuki','Serika','Nonomi','Karin','Haruka','Izumi','Ui','Mika','Sora','Toki','Ako']

interface Player {
  id: string; ign: string; username: string; favouriteStudent?: string | null
  joinedDate?: string | null; club?: string | null; clubID?: string | null
  userID?: string | null
}

interface RaidBoss {
  id: string; name: string; description: string; image?: string | null
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
  status: string
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

const navItems = [
  { id: 'dashboard' as Section, label: 'Dashboard', icon: '◈' },
  { id: 'players'   as Section, label: 'Players',   icon: '◎' },
  { id: 'raids'     as Section, label: 'Raids',     icon: '⬡' },
  { id: 'bosses'    as Section, label: 'Bosses',    icon: '◉' },
  { id: 'entries'   as Section, label: 'Entries',   icon: '⊞' },
  { id: 'settings'  as Section, label: 'Settings',  icon: '⊛' },
]

const RAID_TYPES  = ['Total Assault', 'Grand Assault']
const RAID_SERVERS = ['Global', 'Japan']

export function AdminPanel() {
  const [sec, setSec] = useState<Section>('dashboard')
  const [players, setPlayers]   = useState<Player[]>([])
  const [raids, setRaids]       = useState<Raid[]>([])
  const [bosses, setBosses]     = useState<RaidBoss[]>([])
  const [raidTypes, setRaidTypes]     = useState<RaidType[]>([])
  const [raidServers, setRaidServers] = useState<RaidServer[]>([])
  const [entries, setEntries]   = useState<Entry[]>([])
  const [modal, setModal]       = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<Player | Raid | Entry | RaidBoss | null>(null)
  const [toast, setToast]       = useState<string | null>(null)

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

  // ── Player form ────────────────────────────────────────────────────────────
  const emptyP = { ign: '', username: '', favouriteStudent: 'Hoshino', joinedDate: '', club: 'Guest', clubID: 'GUEST', userID: '' }
  const [pForm, setPForm] = useState(emptyP)

  function openAddPlayer() { setPForm(emptyP); setEditTarget(null); setModal('player') }
  function openEditPlayer(p: Player) {
    setPForm({ ign: p.ign, username: p.username, favouriteStudent: p.favouriteStudent || 'Hoshino', joinedDate: p.joinedDate ? p.joinedDate.split('T')[0] : '', club: p.club || 'Guest', clubID: p.clubID || (p.club === 'Guest' ? 'GUEST' : ''), userID: p.userID || '' })
    setEditTarget(p); setModal('player')
  }
  async function deletePlayer(id: string) {
    await fetch(`/api/admin/players/${id}`, { method: 'DELETE' }); loadPlayers(); showToast('Player deleted.')
  }
  async function savePlayer(e: React.FormEvent) {
    e.preventDefault()
    if (editTarget) {
      await fetch(`/api/admin/players/${(editTarget as Player).id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pForm) })
      showToast('Player updated.')
    } else {
      await fetch('/api/admin/players', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pForm) })
      showToast('Player added.')
    }
    setModal(null); loadPlayers()
  }

  // ── Raid Boss form ─────────────────────────────────────────────────────────
  const emptyB = { name: '', description: '', image: '' }
  const [bForm, setBForm] = useState(emptyB)

  function openAddBoss() { setBForm(emptyB); setEditTarget(null); setModal('boss') }
  function openEditBoss(b: RaidBoss) {
    setBForm({ name: b.name, description: b.description, image: b.image || '' })
    setEditTarget(b); setModal('boss')
  }
  async function deleteBoss(id: string) {
    await fetch(`/api/admin/raid-bosses/${id}`, { method: 'DELETE' }); loadBosses(); showToast('Boss deleted.')
  }
  async function saveBoss(e: React.FormEvent) {
    e.preventDefault()
    const payload = { name: bForm.name, description: bForm.description, image: bForm.image || null }
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
    status: 'CURRENT', color: '#4f8ef7', color2: '#7c3aed', pattern: 'hex',
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
      status: r.status,
      color: r.color, color2: r.color2, pattern: r.pattern,
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

  const activeRaidCount = raids.filter(r => r.status === 'CURRENT').length

  return (
    <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', minHeight: 520, position: 'relative' }}>
      {/* Sidebar */}
      <div style={{ width: 196, background: 'var(--bg)', borderRight: '1px solid var(--border)', padding: '20px 0', flexShrink: 0 }}>
        <div style={{ padding: '0 16px 14px', fontSize: 11, color: 'var(--muted)', letterSpacing: '0.1em', fontWeight: 600 }}>ADMIN PANEL</div>
        {navItems.map((n) => (
          <button
            key={n.id}
            onClick={() => setSec(n.id)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px',
              background: sec === n.id ? 'rgba(79,142,247,0.12)' : 'none',
              border: 'none', borderLeft: sec === n.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: sec === n.id ? 'var(--accent)' : 'var(--muted2)',
              cursor: 'pointer', fontSize: 14, fontWeight: sec === n.id ? 600 : 400,
              textAlign: 'left', transition: 'all 0.15s',
              fontFamily: 'var(--font), Space Grotesk, sans-serif',
            }}
          >
            <span style={{ fontSize: 16 }}>{n.icon}</span>{n.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>

        {/* DASHBOARD */}
        {sec === 'dashboard' && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Dashboard</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { l: 'Total Players', v: players.length,     c: 'var(--accent)' },
                { l: 'Active Raids',  v: activeRaidCount,    c: 'var(--green)'  },
                { l: 'Total Entries', v: entries.length,     c: '#a78bfa'       },
              ].map((d) => (
                <div key={d.l} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: d.c, fontFamily: 'var(--mono)' }}>{d.v}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{d.l}</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Recent Activity</div>
              {entries.slice(0, 10).map((e, i) => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 9 && i < entries.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{e.player.ign}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>
                      Entry — {e.raid.raidBoss.name} S{e.raid.season}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--green)', fontFamily: 'var(--mono)', fontSize: 13 }}>+{e.score.toLocaleString()}</span>
                    <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 10 }}>{new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PLAYERS */}
        {sec === 'players' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Players <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 400 }}>({players.length})</span></div>
              <button onClick={openAddPlayer} style={{ background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '9px 18px', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>+ Add Player</button>
            </div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border2)', background: 'rgba(255,255,255,0.02)' }}>
                      {['IGN','USERNAME','FAV STUDENT','CLUB / ID','USER ID','ACTIONS'].map((h) => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: i < players.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '11px 14px', fontWeight: 600 }}>{p.ign}</td>
                        <td style={{ padding: '11px 14px', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>@{p.username}</td>
                        <td style={{ padding: '11px 14px', color: 'var(--muted2)', fontSize: 13 }}>{p.favouriteStudent}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ fontSize: 13 }}>{p.club || 'Guest'}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{p.clubID || (p.club === 'Guest' ? 'GUEST' : '—')}</div>
                        </td>
                        <td style={{ padding: '11px 14px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted2)' }}>{p.userID || '—'}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => openEditPlayer(p)} style={{ background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.3)', borderRadius: 6, padding: '4px 10px', color: 'var(--accent)', fontSize: 12, cursor: 'pointer' }}>Edit</button>
                            <button onClick={() => deletePlayer(p.id)} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 6, padding: '4px 10px', color: 'var(--red)', fontSize: 12, cursor: 'pointer' }}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* RAIDS */}
        {sec === 'raids' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Raids</div>
              <button onClick={openAddRaid} style={{ background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '9px 18px', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>+ Add Raid</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {raids.map((r) => (
                <div key={r.id} style={{ background: 'var(--card)', border: `1px solid ${r.color}25`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 3, height: 36, borderRadius: 2, background: r.color, boxShadow: `0 0 8px ${r.color}60`, flexShrink: 0 }} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700 }}>{r.raidBoss.name}</span>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>S{r.season} · {r.type.name}</span>
                        <ServerBadge server={r.server.name} />
                        {r.status === 'CURRENT' && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(52,211,153,0.15)', color: 'var(--green)', border: '1px solid rgba(52,211,153,0.35)' }}>LIVE</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, fontFamily: 'var(--mono)' }}>
                        {fmtDate(r.startDate)} — {fmtDate(r.endDate)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => openEditRaid(r)} style={{ background: `${r.color}18`, border: `1px solid ${r.color}40`, borderRadius: 6, padding: '6px 12px', color: r.color, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                    <button onClick={() => deleteRaid(r.id)} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 6, padding: '6px 12px', color: 'var(--red)', fontSize: 12, cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BOSSES */}
        {sec === 'bosses' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Raid Bosses <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 400 }}>({bosses.length})</span></div>
              <button onClick={openAddBoss} style={{ background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '9px 18px', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>+ Add Boss</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bosses.map((b) => (
                <div key={b.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {b.image ? (
                      <img src={b.image} alt={b.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--card2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>◉</div>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{b.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, maxWidth: 400 }}>{b.description || <span style={{ fontStyle: 'italic' }}>No description</span>}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => openEditBoss(b)} style={{ background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.3)', borderRadius: 6, padding: '6px 12px', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                    <button onClick={() => deleteBoss(b.id)} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 6, padding: '6px 12px', color: 'var(--red)', fontSize: 12, cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ENTRIES */}
        {sec === 'entries' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Entries</div>
              <button onClick={openAddEntry} style={{ background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '9px 18px', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>+ Add Entry</button>
            </div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border2)', background: 'rgba(255,255,255,0.02)' }}>
                      {['PLAYER','RAID','SERVER','SCORE','DATE','ACTIONS'].map((h) => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, i) => (
                      <tr key={e.id} style={{ borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '11px 14px', fontWeight: 600 }}>{e.player.ign}</td>
                        <td style={{ padding: '11px 14px', color: 'var(--muted2)' }}>{e.raid.raidBoss.name} S{e.raid.season}</td>
                        <td style={{ padding: '11px 14px' }}><ServerBadge server={e.raid.server.name} /></td>
                        <td style={{ padding: '11px 14px', fontFamily: 'var(--mono)', color: 'var(--accent)', fontWeight: 600 }}>{e.score.toLocaleString()}</td>
                        <td style={{ padding: '11px 14px', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>{new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => openEditEntry(e)} style={{ background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.3)', borderRadius: 6, padding: '4px 8px', color: 'var(--accent)', fontSize: 11, cursor: 'pointer' }}>Edit</button>
                            <button onClick={() => deleteEntry(e.id)} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 6, padding: '4px 8px', color: 'var(--red)', fontSize: 11, cursor: 'pointer' }}>Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {sec === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--muted)', gap: 12 }}>
            <div style={{ fontSize: 40 }}>⊛</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--muted2)' }}>Settings</div>
            <div style={{ fontSize: 13 }}>Site configuration would go here in production.</div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast} />}

      {/* Player modal */}
      {modal === 'player' && (
        <StModal title={editTarget ? 'Edit Player' : 'Add Player'} onClose={() => setModal(null)} wide>
          <form onSubmit={savePlayer}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <StField label="IGN"><input style={inputStyle} type="text" value={pForm.ign} onChange={e => setPForm(f => ({ ...f, ign: e.target.value }))} placeholder="In-game name" required /></StField>
              <StField label="USERNAME"><input style={inputStyle} type="text" value={pForm.username} onChange={e => setPForm(f => ({ ...f, username: e.target.value }))} placeholder="@handle" required /></StField>
              <StField label="FAVOURITE STUDENT (AVATAR)">
                <select style={inputStyle} value={pForm.favouriteStudent} onChange={e => setPForm(f => ({ ...f, favouriteStudent: e.target.value }))}>
                  {STUDENTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </StField>
              <StField label="JOINED DATE"><input style={inputStyle} type="date" value={pForm.joinedDate} onChange={e => setPForm(f => ({ ...f, joinedDate: e.target.value }))} /></StField>
              <StField label="CLUB"><input style={inputStyle} type="text" value={pForm.club} onChange={e => setPForm(f => ({ ...f, club: e.target.value }))} placeholder="Guest" /></StField>
              <StField label="CLUB ID"><input style={inputStyle} type="text" value={pForm.clubID} onChange={e => setPForm(f => ({ ...f, clubID: e.target.value }))} placeholder="e.g. MIL001" /></StField>
              <StField label="USER ID"><input style={inputStyle} type="text" value={pForm.userID} onChange={e => setPForm(f => ({ ...f, userID: e.target.value }))} placeholder="e.g. USR011" /></StField>
            </div>
            <button type="submit" style={{ width: '100%', background: 'var(--accent)', border: 'none', borderRadius: 8, padding: 12, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 6 }}>
              {editTarget ? 'Save Changes' : 'Add Player'}
            </button>
          </form>
        </StModal>
      )}

      {/* Boss modal */}
      {modal === 'boss' && (
        <StModal title={editTarget ? 'Edit Raid Boss' : 'Add Raid Boss'} onClose={() => setModal(null)} wide>
          <form onSubmit={saveBoss}>
            <StField label="BOSS NAME" span2>
              <input style={inputStyle} type="text" value={bForm.name} onChange={e => setBForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Void Sanctum" required />
            </StField>
            <StField label="IMAGE URL" span2>
              <input style={inputStyle} type="text" value={bForm.image} onChange={e => setBForm(f => ({ ...f, image: e.target.value }))} placeholder="https://... (optional)" />
            </StField>
            {bForm.image && (
              <div style={{ marginBottom: 12 }}>
                <img src={bForm.image} alt="Preview" style={{ height: 80, borderRadius: 8, border: '1px solid var(--border)', objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />
              </div>
            )}
            <StField label="DESCRIPTION" span2>
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} value={bForm.description} onChange={e => setBForm(f => ({ ...f, description: e.target.value }))} placeholder="Boss lore / description…" />
            </StField>
            <button type="submit" style={{ width: '100%', background: 'var(--accent)', border: 'none', borderRadius: 8, padding: 12, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 6 }}>
              {editTarget ? 'Save Changes' : 'Add Boss'}
            </button>
          </form>
        </StModal>
      )}

      {/* Raid modal */}
      {modal === 'raid' && (
        <StModal title={editTarget ? 'Edit Raid' : 'Add Raid'} onClose={() => setModal(null)}>
          <form onSubmit={saveRaid}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <StField label="RAID BOSS" span2>
                <select style={inputStyle} value={rForm.raidBossId} onChange={e => setRForm(f => ({ ...f, raidBossId: e.target.value }))} required>
                  <option value="">— Select Boss —</option>
                  {bosses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </StField>
              <StField label="SEASON">
                <input style={inputStyle} type="number" min="1" value={rForm.season} onChange={e => setRForm(f => ({ ...f, season: e.target.value }))} placeholder="e.g. 3" required />
              </StField>
              <StField label="TYPE">
                <select style={inputStyle} value={rForm.typeId} onChange={e => setRForm(f => ({ ...f, typeId: e.target.value }))} required>
                  <option value="">— Select Type —</option>
                  {raidTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  {raidTypes.length === 0 && RAID_TYPES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </StField>
              <StField label="SERVER">
                <select style={inputStyle} value={rForm.serverId} onChange={e => setRForm(f => ({ ...f, serverId: e.target.value }))} required>
                  <option value="">— Select Server —</option>
                  {raidServers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  {raidServers.length === 0 && RAID_SERVERS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </StField>
              <StField label="STATUS">
                <select style={inputStyle} value={rForm.status} onChange={e => setRForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="CURRENT">Current (Live)</option>
                  <option value="PREVIOUS">Previous (Archived)</option>
                </select>
              </StField>
              <StField label="PRIMARY COLOR"><input style={{ ...inputStyle, height: 42 }} type="color" value={rForm.color} onChange={e => setRForm(f => ({ ...f, color: e.target.value }))} /></StField>
              <StField label="SECONDARY COLOR"><input style={{ ...inputStyle, height: 42 }} type="color" value={rForm.color2} onChange={e => setRForm(f => ({ ...f, color2: e.target.value }))} /></StField>
              <StField label="PATTERN">
                <select style={inputStyle} value={rForm.pattern} onChange={e => setRForm(f => ({ ...f, pattern: e.target.value }))}>
                  <option value="hex">Hexagons</option>
                  <option value="grid">Grid</option>
                  <option value="diamond">Diamond</option>
                  <option value="dot">Dots</option>
                </select>
              </StField>
              <StField label="START DATE"><input style={inputStyle} type="date" value={rForm.startDate} onChange={e => setRForm(f => ({ ...f, startDate: e.target.value }))} required /></StField>
              <StField label="END DATE"><input style={inputStyle} type="date" value={rForm.endDate} onChange={e => setRForm(f => ({ ...f, endDate: e.target.value }))} required /></StField>
            </div>
            <button type="submit" style={{ width: '100%', background: 'var(--accent)', border: 'none', borderRadius: 8, padding: 12, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 6 }}>
              {editTarget ? 'Save Changes' : 'Add Raid'}
            </button>
          </form>
        </StModal>
      )}

      {/* Entry modal */}
      {modal === 'entry' && (
        <StModal title={editTarget ? 'Edit Entry' : 'Add Entry'} onClose={() => setModal(null)}>
          <form onSubmit={saveEntry}>
            <StField label="PLAYER" span2>
              <select style={inputStyle} value={eForm.playerId} onChange={e => setEForm(f => ({ ...f, playerId: e.target.value }))} required>
                <option value="">— Select Player —</option>
                {players.map(p => <option key={p.id} value={p.id}>{p.ign} (@{p.username})</option>)}
              </select>
            </StField>
            <StField label="RAID" span2>
              <select style={inputStyle} value={eForm.raidId} onChange={e => setEForm(f => ({ ...f, raidId: e.target.value }))}>
                {raids.map(r => <option key={r.id} value={r.id}>{r.raidBoss.name} — S{r.season} ({r.server.name})</option>)}
              </select>
            </StField>
            <StField label="SCORE" span2><input style={inputStyle} type="number" placeholder="e.g. 12500" value={eForm.score} onChange={e => setEForm(f => ({ ...f, score: e.target.value }))} required /></StField>
            <button type="submit" style={{ width: '100%', background: 'var(--accent)', border: 'none', borderRadius: 8, padding: 12, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {editTarget ? 'Save Changes' : 'Add Entry'}
            </button>
          </form>
        </StModal>
      )}
    </div>
  )
}
