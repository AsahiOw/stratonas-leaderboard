'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { RaidCard } from '@/components/RaidCard'
import type { TableEntry } from '@/components/LeaderboardTable'
import { StModal } from '@/components/ui/StModal'
import {
  downloadBlob,
  downloadRaidCardPng,
  raidCardFilename,
  raidCardToBlob,
  safeExportFilename,
} from '@/lib/raid-card-export'
import JSZip from 'jszip'

interface RaidCardRaid {
  raidBoss: { name: string; description: string; image?: string | null }
  season: number
  type: { name: string }
  server: { name: string }
  terrain: { name: string }
  color: string
  color2: string
}

interface Props {
  raid: RaidCardRaid
  entries: TableEntry[]
}

type View = 'menu' | 'selected' | 'custom'

interface ExportCardState {
  raid: RaidCardRaid
  entry: TableEntry
  watermarkLabel?: string
  key: string
}

interface CustomPlayerOption {
  id: string
  ign: string
  favouriteStudentData?: CustomStudentOption | null
  clubData?: CustomClubOption | null
}

interface CustomClubOption {
  id: string
  name: string
  logo?: string | null
  color?: string | null
}

interface CustomStudentOption {
  id: number
  name: string
  image?: string | null
  portrait?: string | null
  memorial?: string | null
  portraitOffsetX?: number | null
  portraitOffsetY?: number | null
  portraitScale?: number | null
  memorialOffsetX?: number | null
  memorialOffsetY?: number | null
  memorialScale?: number | null
}

interface CustomForm {
  useDatabasePlayer: boolean
  useDatabaseClub: boolean
  useDatabaseStudent: boolean
  playerId: string
  clubId: string
  studentId: string
  playerName: string
  rank: string
  score: string
  clubName: string
  clubColor: string
  clubLogo: string
  clubLogoX: string
  clubLogoY: string
  clubLogoScale: string
  portraitImage: string
  portraitX: string
  portraitY: string
  portraitScale: string
  backgroundImage: string
  backgroundX: string
  backgroundY: string
  backgroundScale: string
  season: string
  boss: string
  raidType: string
  server: string
  terrain: string
}

const WATERMARK = 'Stratonas Custom Card'

const inputClass =
  'w-full rounded-lg border border-border2 bg-card2 px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-muted focus:border-accent'
const toggleClass = 'inline-flex items-center gap-2 text-xs font-semibold text-muted2'
const searchableListClass = 'mt-2 max-h-40 overflow-auto rounded-lg border border-border bg-card'

function cardKey(entry: TableEntry) {
  return entry.playerId || `${entry.rank}-${entry.name}`
}

function raidFileSuffix(raid: RaidCardRaid) {
  return [raid.server.name, raid.raidBoss.name, `s${raid.season}`]
    .filter(Boolean)
    .join('-')
}

function defaultCustomForm(raid: RaidCardRaid): CustomForm {
  return {
    useDatabasePlayer: true,
    useDatabaseClub: true,
    useDatabaseStudent: true,
    playerId: '',
    clubId: '',
    studentId: '',
    playerName: 'Custom Player',
    rank: '1',
    score: '0',
    clubName: 'STRATONAS',
    clubColor: raid.color || '#4f8ef7',
    clubLogo: '',
    clubLogoX: '0',
    clubLogoY: '0',
    clubLogoScale: '1',
    portraitImage: '',
    portraitX: '0',
    portraitY: '0',
    portraitScale: '1',
    backgroundImage: '',
    backgroundX: '-7.6',
    backgroundY: '0',
    backgroundScale: '0.5',
    season: String(raid.season),
    boss: raid.raidBoss.name,
    raidType: raid.type.name,
    server: raid.server.name,
    terrain: raid.terrain.name,
  }
}

function fileUrlFromInput(event: ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0]
  if (!file) return Promise.resolve('')

  return new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(typeof reader.result === 'string' ? reader.result : ''))
    reader.addEventListener('error', () => resolve(''))
    reader.readAsDataURL(file)
  })
}

function numeric(value: string, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function rgbToHex(value: string) {
  const match = value.trim().match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i)
  if (!match) return null

  const channels = match.slice(1, 4).map((part) => Math.max(0, Math.min(255, Number(part))))
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function colorToHex(value: string, fallback: string) {
  const trimmed = value.trim()
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed.slice(1).split('').map((char) => char + char).join('')}`
  }

  return rgbToHex(trimmed) || fallback
}

function nextFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()))
  })
}

export function RaidCardDownloadButton({ raid, entries }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted2 transition-colors hover:border-border2 hover:text-text"
      >
        Download
      </button>
      {open ? (
        <RaidCardDownloadModal
          raid={raid}
          entries={entries}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}

function RaidCardDownloadModal({ raid, entries, onClose }: Props & { onClose: () => void }) {
  const exportRef = useRef<HTMLDivElement | null>(null)
  const customExportCountRef = useRef(0)
  const [view, setView] = useState<View>('menu')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState('')
  const [custom, setCustom] = useState<CustomForm>(() => defaultCustomForm(raid))
  const [exportCard, setExportCard] = useState<ExportCardState | null>(null)
  const [customPlayers, setCustomPlayers] = useState<CustomPlayerOption[]>([])
  const [customClubs, setCustomClubs] = useState<CustomClubOption[]>([])
  const [customStudents, setCustomStudents] = useState<CustomStudentOption[]>([])
  const [customDataLoading, setCustomDataLoading] = useState(false)
  const [playerQuery, setPlayerQuery] = useState('')
  const [clubQuery, setClubQuery] = useState('')
  const [studentQuery, setStudentQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    setCustomDataLoading(true)

    Promise.all([
      fetch('/api/players').then((response) => response.json()),
      fetch('/api/clubs').then((response) => response.json()),
      fetch('/api/students').then((response) => response.json()),
    ])
      .then(([players, clubs, students]) => {
        if (cancelled) return
        setCustomPlayers(Array.isArray(players) ? players : [])
        setCustomClubs(Array.isArray(clubs) ? clubs : [])
        setCustomStudents(Array.isArray(students) ? students : [])
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load custom card selection data.')
      })
      .finally(() => {
        if (!cancelled) setCustomDataLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const selectedEntries = useMemo(
    () => entries.filter((entry) => selectedIds.has(cardKey(entry))),
    [entries, selectedIds],
  )
  const raidFilenameSuffix = raidFileSuffix(raid)
  const zipBaseName = safeExportFilename(`${raidFilenameSuffix}-raid-cards`)
  const selectedCustomPlayer = customPlayers.find((player) => player.id === custom.playerId) || null
  const selectedCustomClub = customClubs.find((club) => club.id === custom.clubId) || selectedCustomPlayer?.clubData || null
  const selectedCustomStudent = customStudents.find((student) => String(student.id) === custom.studentId) || selectedCustomPlayer?.favouriteStudentData || null
  const filteredCustomPlayers = customPlayers
    .filter((player) => player.ign.toLowerCase().includes(playerQuery.trim().toLowerCase()))
    .slice(0, 40)
  const filteredCustomClubs = customClubs
    .filter((club) => club.name.toLowerCase().includes(clubQuery.trim().toLowerCase()))
    .slice(0, 40)
  const filteredCustomStudents = customStudents
    .filter((student) => student.name.toLowerCase().includes(studentQuery.trim().toLowerCase()))
    .slice(0, 40)

  const setCustomField = (field: keyof CustomForm, value: string) => {
    setCustom((current) => ({ ...current, [field]: value }))
  }

  const setCustomToggle = (field: 'useDatabasePlayer' | 'useDatabaseClub' | 'useDatabaseStudent', value: boolean) => {
    setCustom((current) => {
      if (field !== 'useDatabasePlayer' || !value) return { ...current, [field]: value }

      const player = customPlayers.find((item) => item.id === current.playerId)
      const club = player?.clubData
      const student = player?.favouriteStudentData

      if (club) setClubQuery(club.name)
      if (student) setStudentQuery(student.name)

      return {
        ...current,
        useDatabasePlayer: true,
        useDatabaseClub: club ? true : current.useDatabaseClub,
        useDatabaseStudent: student ? true : current.useDatabaseStudent,
        clubId: club?.id || current.clubId,
        clubName: club?.name || current.clubName,
        clubLogo: club?.logo || current.clubLogo,
        clubColor: club?.color || current.clubColor,
        studentId: student?.id ? String(student.id) : current.studentId,
        portraitImage: student?.portrait || student?.image || current.portraitImage,
        backgroundImage: student?.memorial || current.backgroundImage,
        portraitX: String(student?.portraitOffsetX ?? current.portraitX),
        portraitY: String(student?.portraitOffsetY ?? current.portraitY),
        portraitScale: String(student?.portraitScale ?? current.portraitScale),
        backgroundX: String(student?.memorialOffsetX ?? current.backgroundX),
        backgroundY: String(student?.memorialOffsetY ?? current.backgroundY),
        backgroundScale: String(student?.memorialScale ?? current.backgroundScale),
      }
    })
  }

  const applyPlayerSelection = (playerId: string) => {
    const player = customPlayers.find((item) => item.id === playerId)
    const student = player?.favouriteStudentData
    const club = player?.clubData
    setCustom((current) => ({
      ...current,
      playerId,
      useDatabaseClub: club ? true : current.useDatabaseClub,
      useDatabaseStudent: student ? true : current.useDatabaseStudent,
      playerName: player?.ign || current.playerName,
      clubId: club?.id || current.clubId,
      clubName: club?.name || current.clubName,
      clubLogo: club?.logo || current.clubLogo,
      clubColor: club?.color || current.clubColor,
      studentId: student?.id ? String(student.id) : current.studentId,
      portraitImage: student?.portrait || student?.image || current.portraitImage,
      backgroundImage: student?.memorial || current.backgroundImage,
      portraitX: String(student?.portraitOffsetX ?? current.portraitX),
      portraitY: String(student?.portraitOffsetY ?? current.portraitY),
      portraitScale: String(student?.portraitScale ?? current.portraitScale),
      backgroundX: String(student?.memorialOffsetX ?? current.backgroundX),
      backgroundY: String(student?.memorialOffsetY ?? current.backgroundY),
      backgroundScale: String(student?.memorialScale ?? current.backgroundScale),
    }))
    if (player) setPlayerQuery(player.ign)
    if (club) setClubQuery(club.name)
    if (student) setStudentQuery(student.name)
  }

  const applyClubSelection = (clubId: string) => {
    const club = customClubs.find((item) => item.id === clubId)
    setCustom((current) => ({
      ...current,
      clubId,
      clubName: club?.name || current.clubName,
      clubLogo: club?.logo || current.clubLogo,
      clubColor: club?.color || current.clubColor,
    }))
    if (club) setClubQuery(club.name)
  }

  const applyStudentSelection = (studentId: string) => {
    const student = customStudents.find((item) => String(item.id) === studentId)
    setCustom((current) => ({
      ...current,
      studentId,
      portraitImage: student?.portrait || student?.image || current.portraitImage,
      backgroundImage: student?.memorial || current.backgroundImage,
      portraitX: String(student?.portraitOffsetX ?? current.portraitX),
      portraitY: String(student?.portraitOffsetY ?? current.portraitY),
      portraitScale: String(student?.portraitScale ?? current.portraitScale),
      backgroundX: String(student?.memorialOffsetX ?? current.backgroundX),
      backgroundY: String(student?.memorialOffsetY ?? current.backgroundY),
      backgroundScale: String(student?.memorialScale ?? current.backgroundScale),
    }))
    if (student) setStudentQuery(student.name)
  }

  const setCustomFile = async (field: 'clubLogo' | 'portraitImage' | 'backgroundImage', event: ChangeEvent<HTMLInputElement>) => {
    const url = await fileUrlFromInput(event)
    if (!url) return
    setCustomField(field, url)
  }

  const renderExportCard = async (card: ExportCardState) => {
    setExportCard(null)
    await nextFrame()
    setExportCard(card)
    await nextFrame()
    if (!exportRef.current) throw new Error(`Raid card for ${card.entry.name} is not ready yet.`)
    return exportRef.current
  }

  const runZipExport = async (rows: TableEntry[]) => {
    if (exporting || rows.length === 0) return
    setError('')
    setExporting(true)
    setProgress({ done: 0, total: rows.length })

    try {
      if (rows.length === 1) {
        const entry = rows[0]
        const node = await renderExportCard({
          raid,
          entry,
          key: `${cardKey(entry)}-${entry.favouriteStudentId || entry.favouriteStudent || 'student'}-single`,
        })
        await downloadRaidCardPng(
          node,
          raidCardFilename({
            rank: entry.rank,
            name: entry.name,
            suffix: raidFilenameSuffix,
          }),
        )
        setProgress({ done: 1, total: 1 })
        return
      }

      const zip = new JSZip()

      for (let index = 0; index < rows.length; index += 1) {
        const entry = rows[index]
        const node = await renderExportCard({
          raid,
          entry,
          key: `${cardKey(entry)}-${entry.favouriteStudentId || entry.favouriteStudent || 'student'}-${index}`,
        })
        const blob = await raidCardToBlob(node)
        zip.file(
          raidCardFilename({
            rank: entry.rank,
            name: entry.name,
            suffix: raidFilenameSuffix,
          }),
          blob,
        )
        setProgress({ done: index + 1, total: rows.length })
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      downloadBlob(zipBlob, `${zipBaseName}.zip`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to export raid cards.')
    } finally {
      setExportCard(null)
      setExporting(false)
    }
  }

  const runCustomExport = async () => {
    if (exporting) return
    setError('')
    setExporting(true)
    setProgress({ done: 0, total: 1 })

    try {
      customExportCountRef.current += 1
      const node = await renderExportCard({
        raid: customRaid,
        entry: customEntry,
        watermarkLabel: WATERMARK,
        key: `custom-${customExportCountRef.current}`,
      })
      await downloadRaidCardPng(
        node,
        raidCardFilename({ name: custom.playerName, suffix: 'stratonas-custom-card' }),
      )
      setProgress({ done: 1, total: 1 })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to export custom raid card.')
    } finally {
      setExportCard(null)
      setExporting(false)
    }
  }

  const customClubName = custom.useDatabaseClub ? selectedCustomClub?.name || custom.clubName : custom.clubName
  const customClubLogo = custom.useDatabaseClub ? selectedCustomClub?.logo || custom.clubLogo : custom.clubLogo
  const customClubColor = colorToHex(custom.useDatabaseClub ? selectedCustomClub?.color || custom.clubColor : custom.clubColor, raid.color)
  const customPlayerName = custom.useDatabasePlayer ? selectedCustomPlayer?.ign || custom.playerName : custom.playerName
  const customPortraitImage = custom.useDatabaseStudent
    ? selectedCustomStudent?.portrait || selectedCustomStudent?.image || custom.portraitImage
    : custom.portraitImage
  const customBackgroundImage = custom.useDatabaseStudent
    ? selectedCustomStudent?.memorial || custom.backgroundImage
    : custom.backgroundImage

  const customRaid: RaidCardRaid = {
    raidBoss: { name: custom.boss, description: raid.raidBoss.description },
    season: Number(custom.season) || 0,
    type: { name: custom.raidType },
    server: { name: custom.server },
    terrain: { name: custom.terrain },
    color: customClubColor,
    color2: raid.color2,
  }

  const customEntry: TableEntry = {
    rank: Number(custom.rank) || 0,
    name: customPlayerName,
    score: Number(custom.score.replace(/,/g, '')) || 0,
    isGuild: true,
    club: customClubName || null,
    clubColor: customClubColor,
    clubLogo: customClubLogo || null,
    clubLogoOffset: {
      x: numeric(custom.clubLogoX, 0),
      y: numeric(custom.clubLogoY, 0),
      scale: numeric(custom.clubLogoScale, 1),
    },
    favouriteStudent: null,
    favouriteStudentId: selectedCustomStudent?.id || null,
    favouriteStudentImage: customPortraitImage || null,
    favouriteStudentPortrait: customPortraitImage || null,
    favouriteStudentMemorial: customBackgroundImage || null,
    favouriteStudentPortraitOffset: {
      x: numeric(custom.portraitX, selectedCustomStudent?.portraitOffsetX ?? 0),
      y: numeric(custom.portraitY, selectedCustomStudent?.portraitOffsetY ?? 0),
      scale: numeric(custom.portraitScale, selectedCustomStudent?.portraitScale ?? 1),
    },
    favouriteStudentMemorialOffset: {
      x: numeric(custom.backgroundX, selectedCustomStudent?.memorialOffsetX ?? -7.6),
      y: numeric(custom.backgroundY, selectedCustomStudent?.memorialOffsetY ?? 0),
      scale: numeric(custom.backgroundScale, selectedCustomStudent?.memorialScale ?? 0.5),
    },
  }

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <StModal title="Download raid cards" onClose={exporting ? () => undefined : onClose} extraWide>
      <div className="flex flex-col gap-4">
        {progress ? (
          <div className="rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-muted2">
            {exporting
              ? `Preparing ${progress.done}/${progress.total} cards...`
              : `Prepared ${progress.done}/${progress.total} cards.`}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-red/30 bg-red/10 px-3 py-2 text-sm text-red">
            {error}
          </div>
        ) : null}

        {view === 'menu' ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              disabled={exporting || entries.length === 0}
              onClick={() => void runZipExport(entries)}
              className="rounded-xl border border-border2 bg-card2 px-4 py-5 text-left transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="block text-sm font-bold text-text">Download all raid cards</span>
              <span className="mt-2 block text-xs leading-5 text-muted2">Export every displayed card for this raid.</span>
            </button>
            <button
              type="button"
              disabled={exporting || entries.length === 0}
              onClick={() => setView('selected')}
              className="rounded-xl border border-border2 bg-card2 px-4 py-5 text-left transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="block text-sm font-bold text-text">Download selected raid cards</span>
              <span className="mt-2 block text-xs leading-5 text-muted2">Pick one or many players from this leaderboard.</span>
            </button>
            <button
              type="button"
              disabled={exporting}
              onClick={() => setView('custom')}
              className="rounded-xl border border-border2 bg-card2 px-4 py-5 text-left transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="block text-sm font-bold text-text">Customize raid card</span>
              <span className="mt-2 block text-xs leading-5 text-muted2">Create a local custom card with a watermark.</span>
            </button>
          </div>
        ) : null}

        {view === 'selected' ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={exporting}
                onClick={() => setSelectedIds(new Set(entries.map(cardKey)))}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted2 transition-colors hover:border-border2 hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
              >
                Select all
              </button>
              <button
                type="button"
                disabled={exporting}
                onClick={() => setSelectedIds(new Set())}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted2 transition-colors hover:border-border2 hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear
              </button>
              <div className="ml-auto text-xs text-muted2">{selectedEntries.length} selected</div>
            </div>

            <div className="max-h-[52vh] overflow-auto rounded-xl border border-border">
              {entries.map((entry) => {
                const id = cardKey(entry)
                const checked = selectedIds.has(id)
                return (
                  <label
                    key={id}
                    className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-3 last:border-b-0 hover:bg-card2/70"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={exporting}
                      onChange={() => toggleSelected(id)}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    <span className="w-10 text-sm font-bold text-text">#{entry.rank}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-text">{entry.name}</span>
                      <span className="block truncate text-xs text-muted2">{entry.club || 'Guest'}</span>
                    </span>
                    <span className="font-mono text-xs font-bold text-muted2">{entry.score.toLocaleString()}</span>
                  </label>
                )
              })}
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={exporting}
                onClick={() => setView('menu')}
                className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted2 transition-colors hover:border-border2 hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={exporting || selectedEntries.length === 0}
                onClick={() => void runZipExport(selectedEntries)}
                className="rounded-lg border border-accent bg-accent px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Download selected
              </button>
            </div>
          </div>
        ) : null}

        {view === 'custom' ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,460px)]">
            <div className="flex max-h-[68vh] flex-col gap-4 overflow-auto pr-1">
              {customDataLoading ? (
                <div className="rounded-lg border border-border bg-card2 px-3 py-2 text-xs text-muted2">
                  Loading database options...
                </div>
              ) : null}

              <section className="rounded-xl border border-border bg-card2/50 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-text">Player</div>
                  <label className={toggleClass}>
                    <input
                      type="checkbox"
                      checked={custom.useDatabasePlayer}
                      onChange={(e) => setCustomToggle('useDatabasePlayer', e.target.checked)}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    Use database
                  </label>
                </div>
                {custom.useDatabasePlayer ? (
                  <div>
                    <label className="text-xs font-semibold text-muted2">
                      Search player
                      <input
                        className={`${inputClass} mt-1`}
                        value={playerQuery}
                        placeholder="Type a player name..."
                        onChange={(e) => setPlayerQuery(e.target.value)}
                      />
                    </label>
                    <div className={searchableListClass}>
                      {filteredCustomPlayers.map((player) => (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => applyPlayerSelection(player.id)}
                          className={`block w-full border-b border-border px-3 py-2 text-left text-sm transition-colors last:border-b-0 hover:bg-card2 ${
                            custom.playerId === player.id ? 'bg-accent/15 text-text' : 'text-muted2'
                          }`}
                        >
                          {player.ign}
                        </button>
                      ))}
                      {filteredCustomPlayers.length === 0 ? (
                        <div className="px-3 py-3 text-xs text-muted">No players found.</div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <label className="text-xs font-semibold text-muted2">
                    Player name
                    <input className={`${inputClass} mt-1`} value={custom.playerName} onChange={(e) => setCustomField('playerName', e.target.value)} />
                  </label>
                )}
              </section>

              <section className="rounded-xl border border-border bg-card2/50 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-text">Club</div>
                  <label className={toggleClass}>
                    <input
                      type="checkbox"
                      checked={custom.useDatabaseClub}
                      onChange={(e) => setCustomToggle('useDatabaseClub', e.target.checked)}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    Use database
                  </label>
                </div>
                {custom.useDatabaseClub ? (
                  <div>
                    <label className="text-xs font-semibold text-muted2">
                      Search club
                      <input
                        className={`${inputClass} mt-1`}
                        value={clubQuery}
                        placeholder="Type a club name..."
                        onChange={(e) => setClubQuery(e.target.value)}
                      />
                    </label>
                    <div className={searchableListClass}>
                      {filteredCustomClubs.map((club) => (
                        <button
                          key={club.id}
                          type="button"
                          onClick={() => applyClubSelection(club.id)}
                          className={`block w-full border-b border-border px-3 py-2 text-left text-sm transition-colors last:border-b-0 hover:bg-card2 ${
                            custom.clubId === club.id ? 'bg-accent/15 text-text' : 'text-muted2'
                          }`}
                        >
                          {club.name}
                        </button>
                      ))}
                      {filteredCustomClubs.length === 0 ? (
                        <div className="px-3 py-3 text-xs text-muted">No clubs found.</div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-muted2">Club name<input className={`${inputClass} mt-1`} value={custom.clubName} onChange={(e) => setCustomField('clubName', e.target.value)} /></label>
                    <label className="text-xs font-semibold text-muted2">Club logo URL<input className={`${inputClass} mt-1`} value={custom.clubLogo} onChange={(e) => setCustomField('clubLogo', e.target.value)} /></label>
                    <label className="text-xs font-semibold text-muted2">Club color<input className={`${inputClass} mt-1`} value={custom.clubColor} placeholder="#4f8ef7 or rgb(79,142,247)" onChange={(e) => setCustomField('clubColor', e.target.value)} /></label>
                    <label className="text-xs font-semibold text-muted2">Color picker<input className={`${inputClass} mt-1 h-[38px]`} type="color" value={colorToHex(custom.clubColor, raid.color)} onChange={(e) => setCustomField('clubColor', e.target.value)} /></label>
                    <label className="text-xs font-semibold text-muted2">Upload club logo<input className="mt-1 block w-full text-xs text-muted2 file:mr-3 file:rounded file:border-0 file:bg-card2 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-text" type="file" accept="image/*" onChange={(e) => setCustomFile('clubLogo', e)} /></label>
                  </div>
                )}
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="text-xs font-semibold text-muted2">Logo X<input className={`${inputClass} mt-1`} value={custom.clubLogoX} inputMode="decimal" onChange={(e) => setCustomField('clubLogoX', e.target.value)} /></label>
                  <label className="text-xs font-semibold text-muted2">Logo Y<input className={`${inputClass} mt-1`} value={custom.clubLogoY} inputMode="decimal" onChange={(e) => setCustomField('clubLogoY', e.target.value)} /></label>
                  <label className="text-xs font-semibold text-muted2">Logo scale<input className={`${inputClass} mt-1`} value={custom.clubLogoScale} inputMode="decimal" onChange={(e) => setCustomField('clubLogoScale', e.target.value)} /></label>
                </div>
              </section>

              <section className="rounded-xl border border-border bg-card2/50 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-text">Favourite student</div>
                  <label className={toggleClass}>
                    <input
                      type="checkbox"
                      checked={custom.useDatabaseStudent}
                      onChange={(e) => setCustomToggle('useDatabaseStudent', e.target.checked)}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    Use database
                  </label>
                </div>
                {custom.useDatabaseStudent ? (
                  <div>
                    <label className="text-xs font-semibold text-muted2">
                      Search student
                      <input
                        className={`${inputClass} mt-1`}
                        value={studentQuery}
                        placeholder="Type a student name..."
                        onChange={(e) => setStudentQuery(e.target.value)}
                      />
                    </label>
                    <div className={searchableListClass}>
                      {filteredCustomStudents.map((student) => (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => applyStudentSelection(String(student.id))}
                          className={`block w-full border-b border-border px-3 py-2 text-left text-sm transition-colors last:border-b-0 hover:bg-card2 ${
                            custom.studentId === String(student.id) ? 'bg-accent/15 text-text' : 'text-muted2'
                          }`}
                        >
                          {student.name}
                        </button>
                      ))}
                      {filteredCustomStudents.length === 0 ? (
                        <div className="px-3 py-3 text-xs text-muted">No students found.</div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-muted2">Portrait URL<input className={`${inputClass} mt-1`} value={custom.portraitImage} onChange={(e) => setCustomField('portraitImage', e.target.value)} /></label>
                    <label className="text-xs font-semibold text-muted2">Background URL<input className={`${inputClass} mt-1`} value={custom.backgroundImage} onChange={(e) => setCustomField('backgroundImage', e.target.value)} /></label>
                    <label className="text-xs font-semibold text-muted2">Upload portrait<input className="mt-1 block w-full text-xs text-muted2 file:mr-3 file:rounded file:border-0 file:bg-card2 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-text" type="file" accept="image/*" onChange={(e) => setCustomFile('portraitImage', e)} /></label>
                    <label className="text-xs font-semibold text-muted2">Upload background<input className="mt-1 block w-full text-xs text-muted2 file:mr-3 file:rounded file:border-0 file:bg-card2 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-text" type="file" accept="image/*" onChange={(e) => setCustomFile('backgroundImage', e)} /></label>
                  </div>
                )}
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="text-xs font-semibold text-muted2">Portrait X<input className={`${inputClass} mt-1`} value={custom.portraitX} inputMode="decimal" onChange={(e) => setCustomField('portraitX', e.target.value)} /></label>
                  <label className="text-xs font-semibold text-muted2">Portrait Y<input className={`${inputClass} mt-1`} value={custom.portraitY} inputMode="decimal" onChange={(e) => setCustomField('portraitY', e.target.value)} /></label>
                  <label className="text-xs font-semibold text-muted2">Portrait scale<input className={`${inputClass} mt-1`} value={custom.portraitScale} inputMode="decimal" onChange={(e) => setCustomField('portraitScale', e.target.value)} /></label>
                  <label className="text-xs font-semibold text-muted2">Background X<input className={`${inputClass} mt-1`} value={custom.backgroundX} inputMode="decimal" onChange={(e) => setCustomField('backgroundX', e.target.value)} /></label>
                  <label className="text-xs font-semibold text-muted2">Background Y<input className={`${inputClass} mt-1`} value={custom.backgroundY} inputMode="decimal" onChange={(e) => setCustomField('backgroundY', e.target.value)} /></label>
                  <label className="text-xs font-semibold text-muted2">Background scale<input className={`${inputClass} mt-1`} value={custom.backgroundScale} inputMode="decimal" onChange={(e) => setCustomField('backgroundScale', e.target.value)} /></label>
                </div>
              </section>

              <section className="rounded-xl border border-border bg-card2/50 p-3">
                <div className="mb-3 text-sm font-bold text-text">Raid card fields</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-muted2">Score<input className={`${inputClass} mt-1`} value={custom.score} inputMode="numeric" onChange={(e) => setCustomField('score', e.target.value)} /></label>
                  <label className="text-xs font-semibold text-muted2">Rank<input className={`${inputClass} mt-1`} value={custom.rank} inputMode="numeric" onChange={(e) => setCustomField('rank', e.target.value)} /></label>
                  <label className="text-xs font-semibold text-muted2">Season<input className={`${inputClass} mt-1`} value={custom.season} inputMode="numeric" onChange={(e) => setCustomField('season', e.target.value)} /></label>
                  <label className="text-xs font-semibold text-muted2">Boss<input className={`${inputClass} mt-1`} value={custom.boss} onChange={(e) => setCustomField('boss', e.target.value)} /></label>
                  <label className="text-xs font-semibold text-muted2">Raid type<input className={`${inputClass} mt-1`} value={custom.raidType} onChange={(e) => setCustomField('raidType', e.target.value)} /></label>
                  <label className="text-xs font-semibold text-muted2">Terrain<input className={`${inputClass} mt-1`} value={custom.terrain} onChange={(e) => setCustomField('terrain', e.target.value)} /></label>
                </div>
              </section>
            </div>

            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-border bg-card2 p-3">
                <RaidCard raid={customRaid} entry={customEntry} exportMode watermarkLabel={WATERMARK} />
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => setView('menu')}
                  className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted2 transition-colors hover:border-border2 hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => setCustom(defaultCustomForm(raid))}
                  className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted2 transition-colors hover:border-border2 hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reset
                </button>
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => void runCustomExport()}
                  className="rounded-lg border border-accent bg-accent px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Download custom card
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div aria-hidden="true" className="pointer-events-none fixed left-[-12000px] top-0 z-[-1] h-[475px] w-[1000px]">
        {exportCard ? (
          <div key={exportCard.key} ref={exportRef} className="h-[475px] w-[1000px]">
            <RaidCard
              key={exportCard.key}
              raid={exportCard.raid}
              entry={exportCard.entry}
              exportMode
              watermarkLabel={exportCard.watermarkLabel}
            />
          </div>
        ) : null}
      </div>
    </StModal>
  )
}
