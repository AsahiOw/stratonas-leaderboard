'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  Search,
  Shield,
  SlidersHorizontal,
  Swords,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { imageSrc } from '@/lib/utils'
import { RaidBanner } from '@/components/RaidBanner'
import { RankBadge } from '@/components/ui/RankBadge'

const YELLOW_STAR_URL = 'https://www.plana-stats.com/images/stars/yellow.png'
const BLUE_STAR_URL = 'https://www.plana-stats.com/images/stars/blue.png'
const tacticRoles = ['DamageDealer', 'Supporter', 'Healer', 'Tanker', 'Vehicle'] as const
type TacticRole = (typeof tacticRoles)[number]
const tacticRoleLabels: Record<TacticRole, string> = {
  DamageDealer: 'Damage Dealer',
  Supporter: 'Supporter',
  Healer: 'Healer',
  Tanker: 'Tanker',
  Vehicle: 'Tactical Support',
}

type RaidView = 'overview' | 'rankings' | 'usage'

interface PlanaRaid {
  id: string
  region: string
  raidType: 'Total Assault' | 'Grand Assault'
  raidDate: string
  season: string
  label: string
  internalName: string
  terrain: string
  source: string
  maxDifficulty: string | null
  armors: string[]
  difficulties: string[]
  startAt: string | null
  endAt: string | null
  emergingGlobal: boolean
  boss: {
    name: string
    image: string | null
    color: string
    color2: string
    pattern: string
  } | null
}

let cachedRaidCatalog: PlanaRaid[] | null = null

interface StudentOption {
  id: number
  name: string
  pathName: string | null
  image: string
  builds?: string[]
}

interface StudentBuild extends StudentOption {
  build: string
  level: number
  slot: number
  assist: boolean
  skillOrder: number
}

interface RankingPhase {
  armor: string | null
  score: number
  difficulty: string
  teams: Array<{ runId: number; students: StudentBuild[] }>
}

interface Ranking {
  clearId: string
  rank: number
  score: number
  difficulty: string
  phases: RankingPhase[]
}

interface RaidMeta {
  totalRankings: number
  maxRank: number
  difficultyStats: Array<{
    label: string
    count: number
    minScore: number
    maxScore: number
    minRank: number | null
    maxRank: number | null
  }>
  students: StudentOption[]
  mostUsedTeams: Array<{
    armor: string | null
    uses: number
    students: StudentOption[]
  }>
  mostBorrowedStudents: Array<{
    student: StudentOption
    borrows: number
  }>
  mostUsedStudentsByRole: Record<TacticRole, Array<{
    student: StudentOption
    uses: number
  }>>
}

interface RankingsPage {
  total: number
  page: number
  pageSize: number
  pageCount: number
  rankings: Ranking[]
}

interface UsedTeamsPage {
  total: number
  page: number
  pageSize: number
  pageCount: number
  teams: RaidMeta['mostUsedTeams']
}

const regionNames: Record<string, string> = {
  JP: 'Japan',
  NA: 'North America',
  EU: 'Europe',
  KR: 'Korea',
  TW: 'Taiwan',
  AS: 'Asia',
}

const armorColors: Record<string, string> = {
  Normal: 'grey',
  Light: 'red',
  Heavy: 'orange',
  Composite: '#067167',
  Special: '#46adff',
  Elastic: '#9b57aa',
  Structure: '#a07eb2',
}

function raidDateLabel(value: string) {
  if (!/^\d{8}$/.test(value)) return value
  const date = new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

type StudentFilterRule = {
  id: number
  mode: 'include' | 'exclude'
  build: string
  buildComparison: 'eq' | 'lte' | 'gte'
  usage: 'default' | 'self' | 'assist' | 'single' | 'twice'
}

type FormationFilterRule = {
  key: number
  strictOrder: boolean
  search: string
  students: Array<{
    id: number
    slot: number
    startOrder: 'any' | 'start' | '1' | '2' | '3' | '4' | '5'
    borrowed: boolean
  }>
}

function raidDateValue(value: string) {
  return /^\d{8}$/.test(value)
    ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
    : value
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function paginationItems(currentPage: number, pageCount: number): Array<number | string> {
  const pages = pageCount <= 7
    ? Array.from({ length: pageCount }, (_, index) => index + 1)
    : Array.from(new Set([
      1,
      pageCount,
      currentPage - 2,
      currentPage - 1,
      currentPage,
      currentPage + 1,
      currentPage + 2,
    ]))
      .filter((page) => page >= 1 && page <= pageCount)
      .sort((a, b) => a - b)

  const items: Array<number | string> = []
  pages.forEach((page, index) => {
    if (index > 0 && page - pages[index - 1] > 1) items.push(`ellipsis-${page}`)
    items.push(page)
  })
  return items
}

function formationSlotAtPoint(x: number, y: number) {
  const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-formation-key][data-formation-slot]')
  if (!element) return null
  const formationKey = Number(element.dataset.formationKey)
  const slot = Number(element.dataset.formationSlot)
  return Number.isInteger(formationKey) && Number.isInteger(slot) ? { formationKey, slot } : null
}

function buildStars(build: string) {
  const yellow: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 }
  const blue: Record<string, number> = { UE30: 1, UE40: 2, UE50: 3, UE60: 4 }
  if (build in blue) return { color: 'blue' as const, count: blue[build], src: BLUE_STAR_URL }
  return { color: 'yellow' as const, count: yellow[build] || 0, src: YELLOW_STAR_URL }
}

const buildLabels: Record<string, string> = {
  one: '1★',
  two: '2★',
  three: '3★',
  four: '4★',
  five: '5★',
  UE30: 'UE30',
  UE40: 'UE40',
  UE50: 'UE50',
  UE60: 'UE60',
}

const buildOrder = ['one', 'two', 'three', 'four', 'five', 'UE30', 'UE40', 'UE50', 'UE60']

function raidQuery(raid: PlanaRaid, values: Record<string, string> = {}) {
  const params = new URLSearchParams({
    region: raid.region,
    raidType: raid.raidType,
    raidDate: raid.raidDate,
    ...values,
  })
  return `/api/plana/raid?${params}`
}

function StudentLink({
  student,
  className,
  children,
}: {
  student: StudentOption
  className: string
  children: React.ReactNode
}) {
  if (!student.pathName) return <div className={className}>{children}</div>

  return (
    <a
      href={`https://schaledb.com/student/${encodeURIComponent(student.pathName)}`}
      target="_blank"
      rel="noreferrer"
      aria-label={`View ${student.name} on SchaleDB`}
      className={className}
    >
      {children}
    </a>
  )
}

function StudentTile({ student, orderedSkills }: { student: StudentBuild; orderedSkills: boolean }) {
  const stars = buildStars(student.build)
  const isStartingStudent = student.skillOrder > 0 && (!orderedSkills || student.skillOrder <= 3)
  const isLaterStudent = orderedSkills && student.skillOrder > 3

  return (
    <StudentLink
      student={student}
      className="group min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
    >
      <div className={`relative aspect-[1/1.08] overflow-hidden rounded-lg border-2 bg-[#e8f1fb] ${isStartingStudent
        ? 'border-amber-300 shadow-[0_0_0_1px_rgba(252,211,77,0.5),0_0_16px_rgba(252,211,77,0.14)]'
        : isLaterStudent
          ? 'border-cyan-300 shadow-[0_0_0_1px_rgba(103,232,249,0.45),0_0_16px_rgba(103,232,249,0.12)]'
          : 'border-white/20'
        } transition group-hover:-translate-y-0.5 group-hover:border-accent`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc(student.image)}
          alt={student.name}
          className="h-full w-full object-cover object-top"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded bg-black/65 px-1 py-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc(stars.src)} alt="" className="h-3.5 w-3.5 object-contain" />
          <span className={`text-[10px] font-black ${stars.color === 'blue' ? 'text-cyan-200' : 'text-amber-200'}`}>
            {stars.count}
          </span>
        </div>
        <div className="absolute bottom-1 right-1 rounded bg-black/65 px-1 py-0.5 text-[9px] font-bold text-white/85">
          Lv.{student.level}
        </div>
        {student.assist && (
          <span className="absolute right-1 top-1 rounded-md border border-cyan-100/70 bg-cyan-400 px-1 py-0.5 text-[8px] font-black text-slate-950 shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
            ASSIST
          </span>
        )}
        {student.skillOrder > 0 && (
          <span className={`absolute left-1 top-1 rounded-md border px-1 py-0.5 text-[8px] font-black text-slate-950 shadow-[0_2px_8px_rgba(0,0,0,0.45)] ${isStartingStudent
            ? 'border-amber-100/70 bg-amber-300'
            : 'border-cyan-100/70 bg-cyan-300'
            }`}>
            {isStartingStudent ? 'START' : 'NEXT'}{orderedSkills ? ` ${student.skillOrder}` : ''}
          </span>
        )}
      </div>
      <div className="mt-1 truncate text-center text-[10px] font-semibold text-muted2 transition-colors group-hover:text-accent" title={student.name}>
        {student.name}
      </div>
    </StudentLink>
  )
}

function TeamRow({ students, index }: { students: StudentBuild[]; index: number }) {
  const orderedSkills = students.some((student) => student.skillOrder > 1)
  const hasAssist = students.some((student) => student.assist)

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Team {index + 1}</span>
        <div className="flex flex-wrap justify-end gap-1.5 text-[9px] font-black uppercase tracking-[0.05em]">
          {orderedSkills ? (
            <>
              <span className="rounded border border-amber-300/45 bg-amber-300/10 px-1.5 py-1 text-amber-200">
                Start 1–3
              </span>
              <span className="rounded border border-cyan-300/45 bg-cyan-300/10 px-1.5 py-1 text-cyan-200">
                Next 4–5
              </span>
            </>
          ) : (
            <span className="rounded border border-amber-300/45 bg-amber-300/10 px-1.5 py-1 text-amber-200">
              Start
            </span>
          )}
          {hasAssist && (
            <span className="rounded border border-cyan-300/45 bg-cyan-300/10 px-1.5 py-1 text-cyan-200">
              Assist = borrowed
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {students
          .slice()
          .sort((a, b) => a.slot - b.slot)
          .map((student) => (
            <StudentTile
              key={`${student.slot}:${student.id}`}
              student={student}
              orderedSkills={orderedSkills}
            />
          ))}
      </div>
    </div>
  )
}

function RankingCard({
  ranking,
  raid,
  armorFilter,
}: {
  ranking: Ranking
  raid: PlanaRaid
  armorFilter: string
}) {
  const phases = ranking.phases.filter((phase) => (
    !armorFilter || phase.armor === armorFilter
  )).sort((a, b) => {
    const aIndex = raid.armors.indexOf(a.armor || '')
    const bIndex = raid.armors.indexOf(b.armor || '')
    return aIndex - bIndex
  })

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_16px_36px_rgba(0,0,0,0.16)]">
      <header className="flex items-start justify-between gap-4 border-b border-border bg-bg/55 px-4 py-3 sm:px-5">
        <div className="font-mono text-lg font-black text-accent">#{formatNumber(ranking.rank)}</div>
        <div className="text-right">
          <div className="font-mono text-lg font-black text-text sm:text-xl">
            {formatNumber(ranking.score)} <span className="text-xs text-muted">pts</span>
          </div>
        </div>
      </header>

      <div className="divide-y divide-border">
        {phases.map((phase, phaseIndex) => (
          <section key={`${phase.armor || 'total'}:${phaseIndex}`} className="px-4 py-4 sm:px-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-accent" aria-hidden />
                <span className="text-sm font-bold text-text">{phase.armor ? `${phase.armor} Armor` : 'Raid Clear'}</span>
                <span className="rounded border border-border2 bg-bg px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted2">
                  {phase.difficulty}
                </span>
              </div>
              {raid.raidType === 'Grand Assault' && (
                <span className="font-mono text-xs font-semibold text-muted2">{formatNumber(phase.score)} pts</span>
              )}
            </div>

            <div className="space-y-5">
              {phase.teams.map((team, index) => (
                <TeamRow key={team.runId} students={team.students} index={index} />
              ))}
              {phase.teams.length === 0 && (
                <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted">
                  No formation was recorded for this phase.
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </article>
  )
}

function RaidCatalogCard({ raid, onOpen }: { raid: PlanaRaid; onOpen: () => void }) {
  const color = raid.boss?.color || '#4f8ef7'
  const color2 = raid.boss?.color2 || '#7c3aed'
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${raid.label} ${raid.season} ${raid.region} raid data`}
      className="group relative min-h-[104px] w-full overflow-hidden rounded-2xl border border-white/10 bg-clip-padding p-0 text-left shadow-[0_18px_40px_rgba(0,0,0,0.2)] transition duration-200 hover:-translate-y-0.5 hover:border-white/25"
      style={{
        background: `linear-gradient(105deg, ${color}aa 0%, ${color2}55 42%, #000 82%, #000 100%)`,
        backgroundClip: 'padding-box',
      }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,9,14,0.12),rgba(9,9,14,0.3)_58%,rgba(9,9,14,0.75))]" />
      {raid.boss?.image && (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-4/5 sm:w-3/5"
          style={{
            maskImage: 'linear-gradient(to right, transparent 0%, black 55%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 55%)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc(raid.boss.image)}
            alt=""
            className="h-full w-full object-cover object-center opacity-45 transition-transform duration-300 group-hover:scale-[1.04]"
          />
        </div>
      )}
      <div className="relative z-10 flex min-h-[104px] max-w-[76%] flex-col justify-center px-4 py-4 sm:px-5">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="rounded border border-white/25 bg-black/20 px-1.5 py-0.5 text-[9px] font-black tracking-[0.12em] text-white/90">
            {raid.region}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/70">
            {raid.terrain}
          </span>
          {raid.emergingGlobal && (
            <span className="rounded border border-cyan-200/45 bg-cyan-300/15 px-1.5 py-0.5 text-[9px] font-black tracking-[0.08em] text-cyan-100">
              ⏮ EMERGING GLOBAL
            </span>
          )}
        </div>
        <h3 className="text-base font-black leading-tight text-white drop-shadow sm:text-lg">{raid.label}</h3>
        <p className="mt-1 text-xs font-semibold text-white/80 sm:text-[13px]">
          {raid.raidType} {raid.season} · {raidDateLabel(raid.raidDate)}
        </p>
      </div>
    </button>
  )
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-16 text-center">
      <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-border2 border-t-accent" />
      <div className="mt-3 text-sm text-muted2">{label}</div>
    </div>
  )
}

function Pagination({
  page,
  pageCount,
  loading,
  onPage,
}: {
  page: number
  pageCount: number
  loading: boolean
  onPage: (page: number) => void
}) {
  return (
    <div className="mt-5 flex items-center justify-center gap-2 overflow-x-auto pb-1">
      <button
        type="button"
        disabled={page <= 1 || loading}
        onClick={() => onPage(Math.max(1, page - 1))}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-border2 bg-card px-4 text-sm font-bold text-muted2 transition hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={15} aria-hidden />
        <span className="hidden sm:inline">Previous</span>
      </button>
      <div className="flex items-center gap-1">
        {paginationItems(page, pageCount).map((item) => (
          typeof item === 'number' ? (
            <button
              key={item}
              type="button"
              disabled={loading}
              onClick={() => onPage(item)}
              aria-label={`Go to page ${item}`}
              aria-current={item === page ? 'page' : undefined}
              className={`inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-2 font-mono text-sm font-bold transition disabled:cursor-not-allowed ${item === page
                ? 'border-accent bg-accent text-white'
                : 'border-border2 bg-card text-muted2 hover:text-text'
                }`}
            >
              {item}
            </button>
          ) : (
            <span key={item} className="inline-flex h-10 min-w-7 items-center justify-center text-sm text-muted">
              …
            </span>
          )
        ))}
      </div>
      <button
        type="button"
        disabled={page >= pageCount || loading}
        onClick={() => onPage(page + 1)}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-border2 bg-card px-4 text-sm font-bold text-muted2 transition hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight size={15} aria-hidden />
      </button>
    </div>
  )
}

function StudentRankingGrid({
  entries,
  totalLabel,
  emptyLabel,
}: {
  entries: Array<{ student: StudentOption; total: number }>
  totalLabel: string
  emptyLabel: string
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg px-4 py-8 text-center text-sm text-muted">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {[entries.slice(0, 5), entries.slice(5, 10)]
        .filter((students) => students.length > 0)
        .map((students, columnIndex) => (
          <div key={columnIndex} className="overflow-hidden rounded-xl border border-border bg-bg/55">
            <div className="divide-y divide-border">
              {students.map(({ student, total }, index) => {
                const rank = columnIndex * 5 + index + 1
                return (
                  <div key={student.id} className="flex min-h-16 items-center gap-3 px-3 py-2.5 sm:px-4">
                    <div className="flex w-8 shrink-0 justify-center">
                      <RankBadge rank={rank} size="sm" />
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageSrc(student.image)}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg border border-white/20 bg-[#e8f1fb] object-cover object-top"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-text">{student.name}</span>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-sm font-black text-accent">{formatNumber(total)}</div>
                      <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted">{totalLabel}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
    </div>
  )
}

export function PlanaRaidBrowser({ initialRaidId }: { initialRaidId?: string }) {
  const router = useRouter()
  const [raids, setRaids] = useState<PlanaRaid[]>(() => cachedRaidCatalog || [])
  const [catalogLoading, setCatalogLoading] = useState(() => !cachedRaidCatalog)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [selectedRaid, setSelectedRaid] = useState<PlanaRaid | null>(null)
  const [region, setRegion] = useState('all')
  const [raidType, setRaidType] = useState('all')
  const [highlightEmerging, setHighlightEmerging] = useState(true)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<RaidView>('overview')
  const [tacticRole, setTacticRole] = useState<TacticRole>('DamageDealer')
  const [roleTransitionDirection, setRoleTransitionDirection] = useState<'left' | 'right'>('right')
  const [meta, setMeta] = useState<RaidMeta | null>(null)
  const [metaLoading, setMetaLoading] = useState(false)
  const [rankings, setRankings] = useState<RankingsPage | null>(null)
  const [rankingsLoading, setRankingsLoading] = useState(false)
  const [usedTeams, setUsedTeams] = useState<UsedTeamsPage | null>(null)
  const [usedTeamsLoading, setUsedTeamsLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [studentFilters, setStudentFilters] = useState<StudentFilterRule[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [formationFilters, setFormationFilters] = useState<FormationFilterRule[]>([])
  const [draggedStudent, setDraggedStudent] = useState<{ formationKey: number; slot: number } | null>(null)
  const [dragTarget, setDragTarget] = useState<{ formationKey: number; slot: number } | null>(null)
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 })
  const dragPreviewRef = useRef<HTMLDivElement | null>(null)
  const dragTargetRef = useRef<{ formationKey: number; slot: number } | null>(null)
  const dragSessionRef = useRef<{
    formationKey: number
    slot: number
    pointerId: number
    startX: number
    startY: number
    moved: boolean
  } | null>(null)
  const [activeFormationSlot, setActiveFormationSlot] = useState<{
    formationKey: number
    slot: number
    mode: 'pick' | 'settings'
  } | null>(null)
  const [minRank, setMinRank] = useState('1')
  const [maxRank, setMaxRank] = useState('')
  const [selectedRangePreset, setSelectedRangePreset] = useState('')
  const [armorFilter, setArmorFilter] = useState('')
  const [rankIntervalError, setRankIntervalError] = useState<string | null>(null)
  const [appliedFilters, setAppliedFilters] = useState({
    studentFilters: [] as StudentFilterRule[],
    formationFilters: [] as FormationFilterRule[],
    minRank: '1',
    maxRank: '',
    armor: '',
  })

  useEffect(() => {
    if (!activeFormationSlot) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (
        target.closest('[data-formation-editor-panel]')
        || target.closest('[data-formation-key][data-formation-slot]')
      ) return
      setActiveFormationSlot(null)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [activeFormationSlot])

  useEffect(() => {
    if (cachedRaidCatalog) return

    const controller = new AbortController()
    fetch('/api/plana/raids', { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body?.error || 'Could not load Plana raids.')
        return body as PlanaRaid[]
      })
      .then((nextRaids) => {
        cachedRaidCatalog = nextRaids
        setRaids(nextRaids)
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== 'AbortError') setCatalogError(error.message)
      })
      .finally(() => setCatalogLoading(false))
    return () => controller.abort()
  }, [])

  useEffect(() => {
    setSelectedRaid(initialRaidId ? raids.find((raid) => raid.id === initialRaidId) || null : null)
  }, [initialRaidId, raids])

  useEffect(() => {
    if (!selectedRaid) return
    const controller = new AbortController()
    setMetaLoading(true)
    setMeta(null)
    setDetailError(null)
    fetch(raidQuery(selectedRaid, { view: 'meta' }), { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body?.error || 'Could not load raid summary.')
        return body as RaidMeta
      })
      .then(setMeta)
      .catch((error) => {
        if (error instanceof Error && error.name !== 'AbortError') setDetailError(error.message)
      })
      .finally(() => setMetaLoading(false))
    return () => controller.abort()
  }, [selectedRaid])

  useEffect(() => {
    if (!selectedRaid) return
    const controller = new AbortController()
    const values: Record<string, string> = {
      view: 'rankings',
      page: String(page),
      pageSize: '10',
    }
    if (appliedFilters.studentFilters.length) {
      values.studentFilters = JSON.stringify(appliedFilters.studentFilters)
    }
    if (appliedFilters.formationFilters.length) {
      values.formationFilters = JSON.stringify(appliedFilters.formationFilters.map((formation) => ({
        strictOrder: formation.strictOrder,
        students: formation.students,
      })))
    }
    if (appliedFilters.minRank) values.minRank = appliedFilters.minRank
    if (appliedFilters.maxRank) values.maxRank = appliedFilters.maxRank

    setRankingsLoading(true)
    setDetailError(null)
    fetch(raidQuery(selectedRaid, values), { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body?.error || 'Could not load raid rankings.')
        return body as RankingsPage
      })
      .then(setRankings)
      .catch((error) => {
        if (error instanceof Error && error.name !== 'AbortError') setDetailError(error.message)
      })
      .finally(() => setRankingsLoading(false))
    return () => controller.abort()
  }, [selectedRaid, page, appliedFilters])

  useEffect(() => {
    if (!selectedRaid || view !== 'usage') return
    const controller = new AbortController()
    const values: Record<string, string> = {
      view: 'usage',
      page: String(page),
      pageSize: '10',
    }
    if (appliedFilters.studentFilters.length) {
      values.studentFilters = JSON.stringify(appliedFilters.studentFilters.map((filter) => ({
        ...filter,
        build: '',
        buildComparison: 'eq',
        usage: 'default',
      })))
    }
    if (appliedFilters.minRank) values.minRank = appliedFilters.minRank
    if (appliedFilters.maxRank) values.maxRank = appliedFilters.maxRank
    if (appliedFilters.armor) values.armor = appliedFilters.armor

    setUsedTeamsLoading(true)
    setDetailError(null)
    fetch(raidQuery(selectedRaid, values), { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body?.error || 'Could not load formation usage.')
        return body as UsedTeamsPage
      })
      .then(setUsedTeams)
      .catch((error) => {
        if (error instanceof Error && error.name !== 'AbortError') setDetailError(error.message)
      })
      .finally(() => setUsedTeamsLoading(false))
    return () => controller.abort()
  }, [selectedRaid, view, page, appliedFilters])

  const regions = useMemo(
    () => Array.from(new Set(raids.map((raid) => raid.region))).sort(),
    [raids],
  )
  const visibleRaids = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = raids.filter((raid) => {
      if (region !== 'all' && raid.region !== region) return false
      if (raidType !== 'all' && raid.raidType !== raidType) return false
      if (query && !`${raid.label} ${raid.season} ${raid.terrain} ${raid.region}`.toLowerCase().includes(query)) return false
      return true
    })
    return highlightEmerging
      ? filtered.slice().sort((a, b) => {
        const emergingDifference = Number(b.emergingGlobal) - Number(a.emergingGlobal)
        if (emergingDifference) return emergingDifference
        if (a.emergingGlobal && b.emergingGlobal) {
          if (a.raidType === b.raidType) return 0
          return a.raidType === 'Total Assault' ? -1 : 1
        }
        return 0
      })
      : filtered
  }, [raids, region, raidType, search, highlightEmerging])

  function openRaid(raid: PlanaRaid) {
    router.push(`/raiddata/${encodeURIComponent(raid.id)}`)
    setView('overview')
    setPage(1)
    setStudentFilters([])
    setStudentSearch('')
    setFormationFilters([])
    setAdvancedOpen(false)
    setActiveFormationSlot(null)
    setMinRank('1')
    setMaxRank('')
    setSelectedRangePreset('')
    setArmorFilter('')
    setRankIntervalError(null)
    setAppliedFilters({ studentFilters: [], formationFilters: [], minRank: '1', maxRank: '', armor: '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function applyFilters(event: React.FormEvent) {
    event.preventDefault()
    const parsedMinRank = Number(minRank)
    const parsedMaxRank = maxRank ? Number(maxRank) : meta?.maxRank
    if (!Number.isInteger(parsedMinRank) || parsedMinRank < 1) {
      setRankIntervalError('Enter a minimum rank of 1 or higher.')
      return
    }
    if (!Number.isInteger(parsedMaxRank) || parsedMaxRank! < 1) {
      setRankIntervalError('Enter a valid maximum rank.')
      return
    }
    if (parsedMinRank > parsedMaxRank!) {
      setRankIntervalError('The minimum rank cannot be higher than the maximum rank.')
      return
    }
    if (meta?.maxRank && parsedMinRank > meta.maxRank) {
      setRankIntervalError(
        `Formation data for this raid is available only through rank ${formatNumber(meta.maxRank)}.`,
      )
      return
    }
    setRankIntervalError(null)
    setPage(1)
    setAppliedFilters({
      studentFilters: studentFilters.map((filter) => view === 'usage'
        ? { ...filter, build: '', buildComparison: 'eq', usage: 'default' }
        : { ...filter }),
      formationFilters: view === 'usage' ? [] : formationFilters
        .filter((formation) => formation.students.length > 0)
        .map((formation) => ({
          ...formation,
          search: '',
          students: formation.students.map((student) => ({ ...student })),
        })),
      minRank,
      maxRank,
      armor: armorFilter,
    })
    if (view === 'overview') setView('rankings')
  }

  function resetFilters() {
    setStudentFilters([])
    setStudentSearch('')
    setFormationFilters([])
    setActiveFormationSlot(null)
    setMinRank('1')
    setMaxRank('')
    setSelectedRangePreset('')
    setArmorFilter('')
    setRankIntervalError(null)
    setPage(1)
    setAppliedFilters({ studentFilters: [], formationFilters: [], minRank: '1', maxRank: '', armor: '' })
  }

  if (catalogLoading) return <div className="pt-7"><LoadingPanel label="Loading imported raid data..." /></div>

  if (catalogError) {
    return (
      <div className="pt-7">
        <div className="rounded-xl border border-red/30 bg-red/10 px-5 py-8 text-center text-sm text-red">{catalogError}</div>
      </div>
    )
  }

  if (!selectedRaid) {
    return (
      <div className="view-transition pb-8 pt-7">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1.5 text-[11px] font-bold tracking-[0.14em] text-muted">◈ PLANA RAID ARCHIVE</div>
            <h2 className="text-2xl font-black tracking-[-0.03em] text-text sm:text-3xl">Raid Data</h2>
            <p className="mt-1.5 max-w-xl text-[13px] leading-5 text-muted2">
              Raid data sourced from{' '}
              <a
                href="https://www.plana-stats.com/"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-accent underline decoration-accent/40 underline-offset-2 transition-colors hover:text-accent/80"
              >
                Plana Stats
              </a>.
            </p>
          </div>
          <div className="font-mono text-sm text-muted2">
            {visibleRaids.length} {visibleRaids.length === 1 ? 'raid' : 'raids'}
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-border bg-card p-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_160px_180px]">
            <label className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search boss, season, or terrain"
                aria-label="Search Plana raids"
                className="h-10 w-full rounded-lg border border-border2 bg-bg pl-9 pr-3 text-sm text-text outline-none transition focus:border-accent"
              />
            </label>
            <div className="relative">
              <select
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                aria-label="Filter Plana raids by region"
                className="h-10 w-full appearance-none rounded-lg border border-border2 bg-bg pl-3 pr-9 text-sm text-text outline-none focus:border-accent"
              >
                <option value="all">All regions</option>
                {regions.map((code) => <option key={code} value={code}>{regionNames[code] || code}</option>)}
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted2"
                aria-hidden
              />
            </div>
            <div className="relative">
              <select
                value={raidType}
                onChange={(event) => setRaidType(event.target.value)}
                aria-label="Filter Plana raids by type"
                className="h-10 w-full appearance-none rounded-lg border border-border2 bg-bg pl-3 pr-9 text-sm text-text outline-none focus:border-accent"
              >
                <option value="all">All raid types</option>
                <option value="Total Assault">Total Assault</option>
                <option value="Grand Assault">Grand Assault</option>
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted2"
                aria-hidden
              />
            </div>
          </div>
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted2">
            <input
              type="checkbox"
              checked={highlightEmerging}
              onChange={(event) => setHighlightEmerging(event.target.checked)}
              className="h-4 w-4 accent-cyan-400"
            />
            Highlight emerging raids for Global regions
          </label>
        </div>

        {visibleRaids.length ? (
          <div className="space-y-3">
            {visibleRaids.map((raid) => <RaidCatalogCard key={raid.id} raid={raid} onOpen={() => openRaid(raid)} />)}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border px-5 py-16 text-center text-sm text-muted">
            No imported raids match these filters.
          </div>
        )}
      </div>
    )
  }

  const difficultyStatTotal = meta?.difficultyStats.reduce((sum, row) => sum + row.count, 0) || 0
  const [raidSeries, raidBossName = selectedRaid.label] = selectedRaid.label.split(':').map((part) => part.trim())

  return (
    <div className="view-transition pb-10 pt-7">
      <button
        type="button"
        onClick={() => {
          router.push('/raiddata')
        }}
        className="mb-4 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-muted2 transition hover:border-border2 hover:text-text"
      >
        <ArrowLeft size={14} aria-hidden />
        All raids
      </button>

      <div className="mb-5">
        <RaidBanner
          standalone
          raid={{
            raidBoss: {
              name: raidBossName,
              description: raidSeries,
              image: selectedRaid.boss?.image,
            },
            season: selectedRaid.season,
            type: { name: selectedRaid.raidType },
            server: { name: selectedRaid.region },
            terrain: { name: selectedRaid.terrain },
            isActive: false,
            color: selectedRaid.boss?.color || '#4f8ef7',
            color2: selectedRaid.boss?.color2 || '#7c3aed',
            pattern: selectedRaid.boss?.pattern || '',
            startDate: selectedRaid.startAt || raidDateValue(selectedRaid.raidDate),
            endDate: selectedRaid.endAt || raidDateValue(selectedRaid.raidDate),
          }}
        />
      </div>

      <div className="mb-5 flex overflow-x-auto border-b border-border" role="tablist" aria-label="Raid data views">
        {([
          ['overview', 'Overview', Trophy],
          ['rankings', 'Rankings', Swords],
          ['usage', 'Most Used', Users],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => {
              setView(id)
              setPage(1)
            }}
            className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${view === id ? 'border-accent text-accent' : 'border-transparent text-muted2 hover:text-text'
              }`}
          >
            <Icon size={14} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {detailError && (
        <div className="mb-5 rounded-xl border border-red/30 bg-red/10 px-5 py-4 text-sm text-red">{detailError}</div>
      )}

      {view === 'overview' && (
        metaLoading || !meta ? <LoadingPanel label="Reading raid summary..." /> : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Ranked clears</div>
                <div className="mt-2 font-mono text-2xl font-black text-text">{formatNumber(meta.totalRankings)}</div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Students used</div>
                <div className="mt-2 font-mono text-2xl font-black text-text">{formatNumber(meta.students.length)}</div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Highest score</div>
                <div className="mt-2 font-mono text-2xl font-black text-accent">
                  {formatNumber(meta.difficultyStats.reduce((best, row) => Math.max(best, row.maxScore), 0))}
                </div>
              </div>
            </div>

            {selectedRaid.raidType === 'Grand Assault' && selectedRaid.armors.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <h3 className="text-sm font-black text-text">Top-clear phases</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {selectedRaid.armors.map((armor, index) => (
                    <div key={armor} className="rounded-lg border border-border bg-bg px-3 py-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{armor} armor</div>
                      <div className="mt-1 text-sm font-black text-text">{selectedRaid.difficulties[index] || 'Unknown'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <h3 className="text-sm font-black text-text">Difficulty distribution</h3>
                  <p className="mt-1 text-xs text-muted">Recorded clears grouped by difficulty.</p>
                </div>
              </div>
              <div className="space-y-3">
                {meta.difficultyStats.map((stat) => {
                  const width = difficultyStatTotal ? Math.max(2, (stat.count / difficultyStatTotal) * 100) : 0
                  return (
                    <div key={stat.label}>
                      <div className="mb-1 flex justify-between gap-3 text-xs">
                        <span className="font-semibold text-muted2">{stat.label}</span>
                        <span className="font-mono text-muted">{formatNumber(stat.count)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-bg">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, width)}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className="mb-4">
                <h3 className="text-sm font-black text-text">Most borrowed students</h3>
                <p className="mt-1 text-xs text-muted">Top 10 students by total borrowed appearances.</p>
              </div>
              <StudentRankingGrid
                entries={meta.mostBorrowedStudents.map(({ student, borrows }) => ({ student, total: borrows }))}
                totalLabel="Borrowed"
                emptyLabel="No borrowed students were recorded for this raid."
              />
            </div>

            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className="mb-4">
                <h3 className="text-sm font-black text-text">Most used students by tactic role</h3>
                <p className="mt-1 text-xs text-muted">Top 10 {tacticRoleLabels[tacticRole].toLowerCase()} students by total appearances.</p>
                <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Select tactic role">
                  {tacticRoles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      aria-pressed={tacticRole === role}
                      onClick={() => {
                        if (role === tacticRole) return
                        setRoleTransitionDirection(
                          tacticRoles.indexOf(role) < tacticRoles.indexOf(tacticRole) ? 'left' : 'right',
                        )
                        setTacticRole(role)
                      }}
                      className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${tacticRole === role
                        ? 'border-accent bg-accent text-white'
                        : 'border-border2 bg-bg text-muted2 hover:border-accent/50 hover:text-text'
                        }`}
                    >
                      {tacticRoleLabels[role]}
                    </button>
                  ))}
                </div>
              </div>
              <div key={tacticRole} className={`role-ranking-transition role-ranking-from-${roleTransitionDirection}`}>
                <StudentRankingGrid
                  entries={(meta.mostUsedStudentsByRole?.[tacticRole] || []).map(({ student, uses }) => ({ student, total: uses }))}
                  totalLabel="Used"
                  emptyLabel={`No ${tacticRoleLabels[tacticRole].toLowerCase()} students were recorded for this raid.`}
                />
              </div>
            </div>
          </div>
        )
      )}

      {(view === 'rankings' || view === 'usage') && (
        <div>
          <form noValidate onSubmit={applyFilters} className="mb-5 rounded-xl border border-border bg-card p-4">
            <div className="space-y-4">
              <div>
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Students</span>
                <input
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                  placeholder={studentFilters.length ? 'Add another student...' : 'Search by student name'}
                  aria-label="Search students to filter rankings"
                  className="h-10 w-full rounded-lg border border-border2 bg-bg px-3 text-sm text-text outline-none focus:border-accent"
                />
                {studentSearch.trim() && (
                  <div className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-border2 bg-bg p-1">
                    {meta?.students
                      .filter((student) => (
                        !studentFilters.some((filter) => filter.id === student.id)
                        && student.name.toLowerCase().includes(studentSearch.trim().toLowerCase())
                      ))
                      .slice(0, 8)
                      .map((student) => (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => {
                            setStudentFilters((current) => [...current, {
                              id: student.id,
                              mode: 'include',
                              build: '',
                              buildComparison: 'eq',
                              usage: 'default',
                            }])
                            setStudentSearch('')
                          }}
                          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-text transition hover:bg-card2"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imageSrc(student.image)}
                            alt=""
                            className="h-10 w-10 rounded-lg border border-white/20 bg-[#e8f1fb] object-cover object-top"
                          />
                          <span className="font-semibold">{student.name}</span>
                        </button>
                      ))}
                  </div>
                )}
                {studentFilters.length > 0 && (
                  <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {studentFilters.map((filter, filterIndex) => {
                      const student = meta?.students.find((item) => item.id === filter.id)
                      const usageOptions = filter.mode === 'include'
                        ? [
                          ['default', 'Default'],
                          ['self', 'Self Only'],
                          ['assist', 'Assist Only'],
                          ['single', 'Single Use Only'],
                          ['twice', 'Used Twice'],
                        ]
                        : [
                          ['default', 'Exclude All'],
                          ['self', 'Exclude Self'],
                          ['assist', 'Exclude Assist'],
                        ]
                      const updateFilter = (changes: Partial<StudentFilterRule>) => {
                        setStudentFilters((current) => current.map((item, index) => (
                          index === filterIndex ? { ...item, ...changes } : item
                        )))
                      }
                      return (
                        <div key={filter.id} className="relative flex gap-3 rounded-xl border border-border2 bg-bg p-3">
                          <button
                            type="button"
                            onClick={() => setStudentFilters((current) => current.filter((_, index) => index !== filterIndex))}
                            aria-label={`Remove ${student?.name || 'student'} filter`}
                            className="absolute right-2 top-2 z-10 rounded-md bg-black/55 p-1 text-white/70 transition hover:text-white"
                          >
                            <X size={13} aria-hidden />
                          </button>
                          <div className="w-[72px] shrink-0">
                            <div className="aspect-square overflow-hidden rounded-xl border-2 border-white/80 bg-[#e8f1fb]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imageSrc(student?.image || '')}
                                alt={student?.name || `Student ${filter.id}`}
                                className="h-full w-full object-cover object-top"
                              />
                            </div>
                            <div className="mt-1 truncate text-center text-[10px] font-bold text-muted2" title={student?.name}>
                              {student?.name || `Student ${filter.id}`}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1 space-y-2 pr-4">
                            <div className="grid grid-cols-2 rounded-lg border border-border2 bg-card p-0.5 text-xs font-bold">
                              {(['include', 'exclude'] as const).map((mode) => (
                                <button
                                  key={mode}
                                  type="button"
                                  onClick={() => updateFilter({
                                    mode,
                                    usage: ['single', 'twice'].includes(filter.usage) && mode === 'exclude'
                                      ? 'default'
                                      : filter.usage,
                                  })}
                                  className={`rounded-md px-2 py-1.5 capitalize transition ${filter.mode === mode
                                    ? mode === 'include' ? 'bg-blue-500 text-white' : 'bg-red text-white'
                                    : 'text-muted hover:text-text'
                                    }`}
                                >
                                  {mode}
                                </button>
                              ))}
                            </div>
                            {view === 'rankings' && (
                              <div className="relative">
                                <select
                                  value={filter.build}
                                  onChange={(event) => updateFilter({
                                    build: event.target.value,
                                    buildComparison: event.target.value ? filter.buildComparison : 'eq',
                                  })}
                                  aria-label={`${student?.name || 'Student'} build`}
                                  className="h-9 w-full appearance-none rounded-lg border border-border2 bg-card pl-3 pr-9 text-xs text-text outline-none focus:border-accent"
                                >
                                  <option value="">Any build</option>
                                  {(student?.builds || [])
                                    .slice()
                                    .sort((a, b) => buildOrder.indexOf(a) - buildOrder.indexOf(b))
                                    .map((build) => (
                                      <option key={build} value={build}>{buildLabels[build] || build}</option>
                                    ))}
                                </select>
                                <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted2" aria-hidden />
                              </div>
                            )}
                            {view === 'rankings' && filter.build && (
                              <div className="relative">
                                <select
                                  value={filter.buildComparison}
                                  onChange={(event) => updateFilter({
                                    buildComparison: event.target.value as StudentFilterRule['buildComparison'],
                                  })}
                                  aria-label={`${student?.name || 'Student'} build comparison`}
                                  className="h-9 w-full appearance-none rounded-lg border border-border2 bg-card pl-3 pr-9 text-xs font-semibold text-text outline-none focus:border-accent"
                                >
                                  <option value="eq">Equal</option>
                                  <option value="lte">Lower or equal</option>
                                  <option value="gte">Higher or equal</option>
                                </select>
                                <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted2" aria-hidden />
                              </div>
                            )}
                            {view === 'rankings' && (
                              <div className="relative">
                                <select
                                  value={filter.usage}
                                  onChange={(event) => updateFilter({ usage: event.target.value as StudentFilterRule['usage'] })}
                                  aria-label={`${student?.name || 'Student'} usage`}
                                  className={`h-9 w-full appearance-none rounded-lg border bg-card pl-3 pr-9 text-xs font-semibold text-text outline-none ${filter.mode === 'include' ? 'border-blue-500/60 focus:border-blue-400' : 'border-red/60 focus:border-red'
                                    }`}
                                >
                                  {usageOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select>
                                <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted2" aria-hidden />
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {view === 'rankings' && (
                  <p className="mt-1.5 text-[11px] text-muted">
                    Each card can require or exclude a student by build, ownership, assist status, or use count.
                  </p>
                )}
              </div>

              {view === 'rankings' && (
                <div className="rounded-xl border border-border2 bg-bg/45">
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen((open) => !open)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    aria-expanded={advancedOpen}
                  >
                    <span className="flex items-center gap-2 text-sm font-black text-text">
                      <SlidersHorizontal size={15} className="text-accent" aria-hidden />
                      Advanced formation filters
                      {formationFilters.length > 0 && (
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[9px] text-white">
                          {formationFilters.length}
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-semibold text-muted2">{advancedOpen ? 'Hide' : 'Show'}</span>
                  </button>

                  {advancedOpen && (
                    <div className="border-t border-border2 p-3 sm:p-4">
                      <p className="mb-3 text-xs leading-5 text-muted2">
                        Require selected students to appear together in one team. Drag students to arrange strict team order.
                      </p>
                      <div className="space-y-3">
                        {formationFilters.map((formation, formationIndex) => {
                          const updateFormation = (changes: Partial<FormationFilterRule>) => {
                            setFormationFilters((current) => current.map((item) => (
                              item.key === formation.key ? { ...item, ...changes } : item
                            )))
                          }
                          const activeSlot = activeFormationSlot?.formationKey === formation.key
                            ? activeFormationSlot
                            : null
                          const activeEntry = activeSlot
                            ? formation.students.find((entry) => entry.slot === activeSlot.slot)
                            : undefined
                          const activeStudent = activeEntry
                            ? meta?.students.find((student) => student.id === activeEntry.id)
                            : undefined
                          const draggedEntry = draggedStudent?.formationKey === formation.key
                            ? formation.students.find((student) => student.slot === draggedStudent.slot)
                            : undefined
                          const draggedOption = draggedEntry
                            ? meta?.students.find((student) => student.id === draggedEntry.id)
                            : undefined
                          const matchingStudents = activeSlot?.mode === 'pick'
                            ? meta?.students
                              .filter((student) => (
                                !formation.students.some((entry) => entry.id === student.id)
                                && student.name.toLowerCase().includes(formation.search.trim().toLowerCase())
                              ))
                              .slice(0, 10) || []
                            : []

                          return (
                            <section
                              key={formation.key}
                              className={`overflow-hidden rounded-xl border-2 p-3 transition-all duration-200 ${formation.strictOrder
                                ? 'border-amber-300 bg-[linear-gradient(135deg,rgba(252,211,77,0.13),rgba(24,24,35,0.96)_42%)] shadow-[0_0_0_2px_rgba(252,211,77,0.12),0_0_28px_rgba(252,211,77,0.12)]'
                                : 'border-border2 bg-card'
                                }`}
                            >
                              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="text-sm font-black text-text">Formation {formationIndex + 1}</h4>
                                    {formation.strictOrder && (
                                      <span className="rounded-md border border-amber-200/70 bg-amber-300 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-slate-950">
                                        Strict order on
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-muted">{formation.students.length}/6 students</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border-2 px-3 text-xs font-black transition ${formation.strictOrder
                                    ? 'border-amber-200 bg-amber-300 text-slate-950 shadow-[0_0_14px_rgba(252,211,77,0.22)]'
                                    : 'border-border2 bg-bg text-muted2'
                                    }`}>
                                    <input
                                      type="checkbox"
                                      checked={formation.strictOrder}
                                      onChange={(event) => updateFormation({ strictOrder: event.target.checked })}
                                      className="sr-only"
                                    />
                                    {formation.strictOrder ? '✓ Strict order' : 'Strict order'}
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => setFormationFilters((current) => current.filter((item) => item.key !== formation.key))}
                                    aria-label={`Remove formation ${formationIndex + 1}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red/35 bg-red/10 text-red transition hover:bg-red/20"
                                  >
                                    <Trash2 size={14} aria-hidden />
                                  </button>
                                </div>
                              </div>

                              {formation.strictOrder && (
                                <div className="mb-3 rounded-lg border border-amber-300/35 bg-amber-300/10 px-3 py-2 text-[11px] font-semibold text-amber-100">
                                  Slot positions are locked: results must use students in the exact numbered order shown below.
                                </div>
                              )}

                              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                                {Array.from({ length: 6 }, (_, slot) => {
                                  const entry = formation.students.find((student) => student.slot === slot)
                                  const isDraggedSource = draggedStudent?.formationKey === formation.key
                                    && draggedStudent.slot === slot
                                  const student = entry
                                    ? meta?.students.find((item) => item.id === entry.id)
                                    : undefined
                                  const isActive = activeSlot?.slot === slot
                                  const isDropTarget = dragTarget?.formationKey === formation.key && dragTarget.slot === slot
                                  return (
                                    <div
                                      key={slot}
                                      data-formation-key={formation.key}
                                      data-formation-slot={slot}
                                      className="min-w-0"
                                    >
                                      {entry ? (
                                        <button
                                          type="button"
                                          onPointerDown={(event) => {
                                            if (event.button !== 0) return
                                            event.preventDefault()
                                            event.currentTarget.setPointerCapture(event.pointerId)
                                            dragSessionRef.current = {
                                              formationKey: formation.key,
                                              slot,
                                              pointerId: event.pointerId,
                                              startX: event.clientX,
                                              startY: event.clientY,
                                              moved: false,
                                            }
                                          }}
                                          onPointerMove={(event) => {
                                            const session = dragSessionRef.current
                                            if (!session || session.pointerId !== event.pointerId) return
                                            if (!session.moved && Math.hypot(
                                              event.clientX - session.startX,
                                              event.clientY - session.startY,
                                            ) >= 6) {
                                              session.moved = true
                                              setDragStartPosition({ x: event.clientX, y: event.clientY })
                                              setDraggedStudent({ formationKey: formation.key, slot })
                                            }
                                            if (!session.moved) return
                                            if (dragPreviewRef.current) {
                                              dragPreviewRef.current.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`
                                            }
                                            const target = formationSlotAtPoint(event.clientX, event.clientY)
                                            const nextTarget = target?.formationKey === formation.key ? target : null
                                            const previousTarget = dragTargetRef.current
                                            if (
                                              previousTarget?.formationKey !== nextTarget?.formationKey
                                              || previousTarget?.slot !== nextTarget?.slot
                                            ) {
                                              dragTargetRef.current = nextTarget
                                              setDragTarget(nextTarget)
                                            }
                                          }}
                                          onPointerUp={(event) => {
                                            const session = dragSessionRef.current
                                            if (!session || session.pointerId !== event.pointerId) return
                                            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                              event.currentTarget.releasePointerCapture(event.pointerId)
                                            }
                                            if (session.moved) {
                                              const targetSlot = formationSlotAtPoint(event.clientX, event.clientY)
                                              if (targetSlot?.formationKey === formation.key && targetSlot.slot !== slot) {
                                                const target = formation.students.find((item) => item.slot === targetSlot.slot)
                                                updateFormation({
                                                  students: formation.students.map((item) => {
                                                    if (item.id === entry.id) return { ...item, slot: targetSlot.slot }
                                                    if (target && item.id === target.id) return { ...item, slot }
                                                    return item
                                                  }),
                                                })
                                              }
                                            } else {
                                              updateFormation({ search: '' })
                                              setActiveFormationSlot((current) => (
                                                current?.formationKey === formation.key
                                                  && current.slot === slot
                                                  && current.mode === 'settings'
                                                  ? null
                                                  : { formationKey: formation.key, slot, mode: 'settings' }
                                              ))
                                            }
                                            dragSessionRef.current = null
                                            setDraggedStudent(null)
                                            dragTargetRef.current = null
                                            setDragTarget(null)
                                          }}
                                          onPointerCancel={() => {
                                            dragSessionRef.current = null
                                            setDraggedStudent(null)
                                            dragTargetRef.current = null
                                            setDragTarget(null)
                                          }}
                                          onClick={(event) => {
                                            if (event.detail !== 0) return
                                            updateFormation({ search: '' })
                                            setActiveFormationSlot((current) => (
                                              current?.formationKey === formation.key
                                                && current.slot === slot
                                                && current.mode === 'settings'
                                                ? null
                                                : { formationKey: formation.key, slot, mode: 'settings' }
                                            ))
                                          }}
                                          className={`relative block aspect-[1/1.08] w-full touch-none cursor-grab overflow-hidden rounded-lg border-2 text-left select-none active:cursor-grabbing ${isDraggedSource
                                            ? 'border-cyan-300 border-dashed bg-bg text-cyan-200'
                                            : isDropTarget
                                              ? 'scale-[1.03] border-cyan-300 bg-[#e8f1fb] shadow-[0_0_0_3px_rgba(103,232,249,0.28),0_0_20px_rgba(103,232,249,0.2)]'
                                              : isActive
                                                ? 'border-accent bg-[#e8f1fb] shadow-[0_0_0_2px_rgba(79,142,247,0.24)]'
                                                : 'border-white/25 bg-[#e8f1fb]'
                                            }`}
                                        >
                                          {isDraggedSource ? (
                                            <span className="flex h-full w-full flex-col items-center justify-center">
                                              <Plus size={22} aria-hidden />
                                              <span className="mt-1 font-mono text-[9px] font-bold">MOVING</span>
                                            </span>
                                          ) : (
                                            <>
                                              {/* eslint-disable-next-line @next/next/no-img-element */}
                                              <img
                                                src={imageSrc(student?.image || '')}
                                                alt={student?.name || `Student ${entry.id}`}
                                                draggable={false}
                                                className="h-full w-full object-cover object-top"
                                              />
                                              <div className="absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-black/85 to-transparent" />
                                              <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1 py-0.5 font-mono text-[9px] font-black text-white">
                                                {slot + 1}
                                              </span>
                                              {view === 'rankings' && entry.startOrder !== 'any' && (
                                                <span className="absolute left-1 top-1 rounded-md border border-amber-100/70 bg-amber-300 px-1 py-0.5 text-[8px] font-black text-slate-950">
                                                  START{entry.startOrder !== 'start' ? ` ${entry.startOrder}` : ''}
                                                </span>
                                              )}
                                              {view === 'rankings' && entry.borrowed && (
                                                <span className="absolute right-1 top-1 rounded-md border border-cyan-100/70 bg-cyan-400 px-1 py-0.5 text-[8px] font-black text-slate-950">
                                                  ASSIST
                                                </span>
                                              )}
                                            </>
                                          )}
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            updateFormation({ search: '' })
                                            setActiveFormationSlot((current) => (
                                              current?.formationKey === formation.key
                                                && current.slot === slot
                                                && current.mode === 'pick'
                                                ? null
                                                : { formationKey: formation.key, slot, mode: 'pick' }
                                            ))
                                          }}
                                          aria-label={`Add student to formation ${formationIndex + 1}, slot ${slot + 1}`}
                                          className={`flex aspect-[1/1.08] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed bg-bg text-muted transition hover:border-accent hover:text-accent ${isDropTarget
                                            ? 'scale-[1.03] border-cyan-300 bg-cyan-300/15 text-cyan-200 shadow-[0_0_0_3px_rgba(103,232,249,0.25)]'
                                            : isActive ? 'border-accent bg-accent/10 text-accent shadow-[0_0_0_2px_rgba(79,142,247,0.18)]' : 'border-border2'
                                            }`}
                                        >
                                          <Plus size={22} aria-hidden />
                                          <span className="mt-1 font-mono text-[9px] font-bold">SLOT {slot + 1}</span>
                                        </button>
                                      )}
                                      <div className="mt-1 truncate text-center text-[10px] font-semibold text-muted2" title={student?.name}>
                                        {isDraggedSource ? 'Choose a slot' : student?.name || 'Empty'}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>

                              {activeSlot?.mode === 'pick' && (
                                <div
                                  data-formation-editor-panel
                                  className="mt-3 rounded-xl border-2 border-accent bg-[linear-gradient(145deg,rgba(79,142,247,0.14),rgba(14,14,22,0.98)_42%)] p-3 shadow-[0_0_0_3px_rgba(79,142,247,0.1),0_18px_35px_rgba(0,0,0,0.22)] sm:p-4"
                                >
                                  <div className="mb-2 flex items-center justify-between gap-2">
                                    <div>
                                      <span className="text-sm font-black text-text">Choose a student</span>
                                      <div className="mt-0.5 text-xs font-bold text-accent">
                                        Formation {formationIndex + 1} · Slot {activeSlot.slot + 1}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setActiveFormationSlot(null)}
                                      className="rounded p-1 text-muted2 hover:text-text"
                                      aria-label="Close student picker"
                                    >
                                      <X size={14} aria-hidden />
                                    </button>
                                  </div>
                                  <input
                                    autoFocus
                                    value={formation.search}
                                    onChange={(event) => updateFormation({ search: event.target.value })}
                                    placeholder="Search student name..."
                                    className="h-11 w-full rounded-lg border border-accent/50 bg-card px-3 text-sm text-text outline-none focus:border-accent"
                                  />
                                  {!formation.search.trim() && (
                                    <div className="mt-4 rounded-lg border border-dashed border-border2 px-4 py-7 text-center">
                                      <Search size={19} className="mx-auto text-accent" aria-hidden />
                                      <div className="mt-2 text-xs font-bold text-muted2">Type a name to find the student for this slot.</div>
                                      <div className="mt-1 text-[10px] text-muted">Portraits and variant names will appear here.</div>
                                    </div>
                                  )}
                                  {formation.search.trim() && (
                                    <div className="mt-3 grid max-h-[360px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                                      {matchingStudents.map((student) => (
                                        <button
                                          key={student.id}
                                          type="button"
                                          onClick={() => {
                                            updateFormation({
                                              search: '',
                                              students: [...formation.students, {
                                                id: student.id,
                                                slot: activeSlot.slot,
                                                startOrder: 'any',
                                                borrowed: false,
                                              }],
                                            })
                                            setActiveFormationSlot(null)
                                          }}
                                          className="group overflow-hidden rounded-xl border border-border2 bg-card text-left transition hover:border-accent hover:bg-card2"
                                        >
                                          <div className="aspect-[1/0.78] overflow-hidden bg-[#e8f1fb]">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                              src={imageSrc(student.image)}
                                              alt=""
                                              className="h-full w-full object-cover object-top transition group-hover:scale-[1.03]"
                                            />
                                          </div>
                                          <span className="block truncate px-2 py-2 text-center text-[11px] font-bold text-text" title={student.name}>
                                            {student.name}
                                          </span>
                                        </button>
                                      ))}
                                      {matchingStudents.length === 0 && (
                                        <div className="col-span-full px-3 py-5 text-center text-xs text-muted">No matching student.</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {activeSlot?.mode === 'settings' && activeEntry && (
                                <div
                                  data-formation-editor-panel
                                  className="mt-3 rounded-xl border-2 border-accent bg-[linear-gradient(145deg,rgba(79,142,247,0.14),rgba(14,14,22,0.98)_42%)] p-3 shadow-[0_0_0_3px_rgba(79,142,247,0.1),0_18px_35px_rgba(0,0,0,0.22)] sm:p-4"
                                >
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <div className="flex min-w-0 items-center gap-3">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={imageSrc(activeStudent?.image || '')}
                                        alt={activeStudent?.name || `Student ${activeEntry.id}`}
                                        className="h-14 w-14 rounded-xl border border-white/30 bg-[#e8f1fb] object-cover object-top"
                                      />
                                      <div className="min-w-0">
                                        <div className="truncate text-sm font-black text-text">{activeStudent?.name}</div>
                                        <div className="text-[11px] font-bold text-accent">
                                          Formation {formationIndex + 1} · Slot {activeEntry.slot + 1}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
                                      {view === 'rankings' && (
                                        <>
                                          <div className="relative">
                                            <select
                                              value={activeEntry.startOrder}
                                              onChange={(event) => updateFormation({
                                                students: formation.students.map((item) => (
                                                  item.id === activeEntry.id
                                                    ? { ...item, startOrder: event.target.value as typeof activeEntry.startOrder }
                                                    : item
                                                )),
                                              })}
                                              className="h-9 appearance-none rounded-lg border border-border2 bg-card pl-3 pr-9 text-xs font-semibold text-text outline-none focus:border-accent"
                                            >
                                              <option value="any">No start requirement</option>
                                              <option value="start">Started</option>
                                              <option value="1">Start #1</option>
                                              <option value="2">Start #2</option>
                                              <option value="3">Start #3</option>
                                              <option value="4">Start #4</option>
                                              <option value="5">Start #5</option>
                                            </select>
                                            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted2" aria-hidden />
                                          </div>
                                          <label className={`inline-flex h-9 cursor-pointer items-center rounded-lg border px-3 text-xs font-black transition ${activeEntry.borrowed
                                            ? 'border-cyan-300/60 bg-cyan-300/15 text-cyan-200'
                                            : 'border-border2 bg-card text-muted2'
                                            }`}>
                                            <input
                                              type="checkbox"
                                              checked={activeEntry.borrowed}
                                              onChange={(event) => updateFormation({
                                                students: formation.students.map((item) => (
                                                  item.id === activeEntry.id ? { ...item, borrowed: event.target.checked } : item
                                                )),
                                              })}
                                              className="sr-only"
                                            />
                                            {activeEntry.borrowed ? 'Borrowed' : 'Require borrow'}
                                          </label>
                                        </>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          updateFormation({
                                            students: formation.students.filter((item) => item.id !== activeEntry.id),
                                          })
                                          setActiveFormationSlot(null)
                                        }}
                                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red/35 bg-red/10 px-3 text-xs font-bold text-red"
                                      >
                                        <Trash2 size={13} aria-hidden />
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {draggedEntry && createPortal(
                                <div
                                  ref={dragPreviewRef}
                                  className="pointer-events-none fixed left-0 top-0 z-[100] will-change-transform"
                                  style={{
                                    transform: `translate3d(${dragStartPosition.x}px, ${dragStartPosition.y}px, 0)`,
                                  }}
                                >
                                  <div className="w-24 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border-2 border-cyan-200 bg-[#e8f1fb] opacity-100 shadow-[0_18px_45px_rgba(0,0,0,0.55),0_0_0_3px_rgba(103,232,249,0.2)]">
                                    <div className="relative aspect-[1/1.08]">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={imageSrc(draggedOption?.image || '')}
                                        alt=""
                                        draggable={false}
                                        className="h-full w-full object-cover object-top opacity-100"
                                      />
                                      {view === 'rankings' && draggedEntry.startOrder !== 'any' && (
                                        <span className="absolute left-1 top-1 rounded bg-amber-300 px-1 py-0.5 text-[8px] font-black text-slate-950">
                                          START{draggedEntry.startOrder !== 'start' ? ` ${draggedEntry.startOrder}` : ''}
                                        </span>
                                      )}
                                      {view === 'rankings' && draggedEntry.borrowed && (
                                        <span className="absolute right-1 top-1 rounded bg-cyan-400 px-1 py-0.5 text-[8px] font-black text-slate-950">
                                          ASSIST
                                        </span>
                                      )}
                                    </div>
                                    <div className="truncate bg-slate-950 px-1.5 py-1 text-center text-[9px] font-black text-white">
                                      {draggedOption?.name || `Student ${draggedEntry.id}`}
                                    </div>
                                  </div>
                                </div>,
                                document.body,
                              )}
                            </section>
                          )
                        })}
                      </div>

                      <button
                        type="button"
                        disabled={formationFilters.length >= 100}
                        onClick={() => setFormationFilters((current) => [...current, {
                          key: current.reduce((highest, item) => Math.max(highest, item.key), 0) + 1,
                          strictOrder: false,
                          search: '',
                          students: [],
                        }])}
                        className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg border border-accent/50 bg-accent/10 px-4 text-sm font-black text-accent transition hover:bg-accent/15 disabled:opacity-40"
                      >
                        <Plus size={15} aria-hidden />
                        Add formation
                      </button>
                    </div>
                  )}
                </div>
              )}

              {selectedRaid.raidType === 'Grand Assault' && (
                <div>
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                    Armor displayed
                  </span>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Armor displayed">
                    <button
                      type="button"
                      onClick={() => setArmorFilter('')}
                      aria-pressed={!armorFilter}
                      className={`h-9 rounded-lg border px-4 text-xs font-black transition ${!armorFilter
                        ? 'border-accent bg-accent text-white'
                        : 'border-border2 bg-bg text-muted2 hover:text-text'
                        }`}
                    >
                      All
                    </button>
                    {selectedRaid.armors.map((armor) => {
                      const color = armorColors[armor] || 'grey'
                      const selected = armorFilter === armor
                      return (
                        <button
                          key={armor}
                          type="button"
                          onClick={() => setArmorFilter(armor)}
                          aria-pressed={selected}
                          className="h-9 rounded-lg border px-4 text-xs font-black transition hover:brightness-125"
                          style={{
                            borderColor: color,
                            backgroundColor: selected ? `color-mix(in srgb, ${color} 28%, transparent)` : 'transparent',
                            color,
                            boxShadow: selected ? `inset 0 0 0 1px ${color}, 0 0 14px color-mix(in srgb, ${color} 24%, transparent)` : undefined,
                          }}
                        >
                          {armor} Armor
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Ranking interval</span>
                <div className="grid gap-2 sm:grid-cols-[1fr_105px_105px]">
                  <div className="relative">
                    <select
                      value={selectedRangePreset}
                      onChange={(event) => {
                        if (!event.target.value) {
                          setSelectedRangePreset('')
                          setMinRank('1')
                          setMaxRank('')
                          setRankIntervalError(null)
                          return
                        }
                        const preset = meta?.difficultyStats.find((stat) => stat.label === event.target.value)
                        if (preset?.minRank && preset.maxRank) {
                          setSelectedRangePreset(event.target.value)
                          setMinRank(String(preset.minRank))
                          setMaxRank(String(preset.maxRank))
                          setRankIntervalError(null)
                        }
                      }}
                      aria-label="Select a difficulty ranking range"
                      className="h-10 w-full appearance-none rounded-lg border border-border2 bg-bg pl-3 pr-9 text-sm text-text outline-none focus:border-accent"
                    >
                      <option value="">Select a range preset</option>
                      {meta?.difficultyStats
                        .filter((stat) => stat.minRank !== null && stat.maxRank !== null)
                        .map((stat) => (
                          <option key={stat.label} value={stat.label}>
                            {stat.label} · ranks {formatNumber(stat.minRank!)}–{formatNumber(stat.maxRank!)}
                          </option>
                        ))}
                    </select>
                    <ChevronDown
                      size={15}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted2"
                      aria-hidden
                    />
                  </div>
                  <input
                    value={minRank}
                    onChange={(event) => {
                      setMinRank(event.target.value)
                      setSelectedRangePreset('')
                      setRankIntervalError(null)
                    }}
                    type="number"
                    min={1}
                    max={meta?.maxRank}
                    aria-label="Minimum ranking"
                    className="h-10 w-full rounded-lg border border-border2 bg-bg px-3 font-mono text-sm text-text outline-none focus:border-accent"
                  />
                  <input
                    value={maxRank}
                    onChange={(event) => {
                      setMaxRank(event.target.value)
                      setSelectedRangePreset('')
                      setRankIntervalError(null)
                    }}
                    type="number"
                    min={1}
                    max={meta?.maxRank}
                    placeholder="Any"
                    aria-label="Maximum ranking"
                    className="h-10 w-full rounded-lg border border-border2 bg-bg px-3 font-mono text-sm text-text outline-none focus:border-accent"
                  />
                </div>
                {rankIntervalError && (
                  <p role="alert" className="mt-2 text-xs font-semibold text-red">
                    {rankIntervalError}
                  </p>
                )}
              </div>
              <div className="flex items-end gap-2">
                <button type="submit" className="h-10 flex-1 rounded-lg bg-accent px-4 text-sm font-black text-white transition hover:bg-accent/90">
                  Apply
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  aria-label="Reset ranking filters"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border2 bg-bg text-muted2 transition hover:text-text"
                >
                  <RotateCcw size={14} aria-hidden />
                </button>
              </div>
            </div>
          </form>

          {view === 'rankings' && (rankingsLoading || !rankings ? <LoadingPanel label="Loading team formations..." /> : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted2">
                <span>{formatNumber(rankings.total)} matching clears</span>
                <span className="font-mono">Page {rankings.page} of {rankings.pageCount}</span>
              </div>
              <div className="space-y-4">
                {rankings.rankings.map((ranking) => (
                  <RankingCard
                    key={ranking.clearId}
                    ranking={ranking}
                    raid={selectedRaid}
                    armorFilter={appliedFilters.armor}
                  />
                ))}
                {rankings.rankings.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border px-5 py-16 text-center text-sm text-muted">
                    No ranked formations match these filters.
                  </div>
                )}
              </div>
              <Pagination
                page={rankings.page}
                pageCount={rankings.pageCount}
                loading={rankingsLoading}
                onPage={setPage}
              />
            </>
          ))}
        </div>
      )}

      {view === 'usage' && (
        usedTeamsLoading || !usedTeams ? <LoadingPanel label="Calculating formation usage..." /> : (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-black text-text">Most Used Teams</h3>
              <p className="mt-1 text-xs text-muted2">
                The most frequently submitted formations among clears matching the filters above.
              </p>
            </div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted2">
              <span>{formatNumber(usedTeams.total)} matching formations</span>
              <span className="font-mono">Page {usedTeams.page} of {usedTeams.pageCount}</span>
            </div>
            <div className="space-y-3">
              {usedTeams.teams.map((team, index) => (
                <article key={`${team.armor || 'total'}:${index}`} className="rounded-xl border border-border bg-card p-3 sm:p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-accent">
                        #{(usedTeams.page - 1) * usedTeams.pageSize + index + 1}
                      </span>
                      {team.armor && (
                        <span className="rounded border border-border2 bg-bg px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted2">
                          {team.armor} Armor
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs font-semibold text-muted2">{formatNumber(team.uses)} uses</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {team.students.map((student, studentIndex) => (
                      <StudentLink
                        key={`${student.id}:${studentIndex}`}
                        student={student}
                        className="group min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
                      >
                        <div className="aspect-square overflow-hidden rounded-lg border border-border2 bg-[#e8f1fb] transition group-hover:-translate-y-0.5 group-hover:border-accent">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imageSrc(student.image)} alt={student.name} className="h-full w-full object-cover object-top" loading="lazy" />
                        </div>
                        <div className="mt-1 truncate text-center text-[10px] font-semibold text-muted2 transition-colors group-hover:text-accent" title={student.name}>
                          {student.name}
                        </div>
                      </StudentLink>
                    ))}
                    {team.students.length === 0 && (
                      <div className="col-span-full py-4 text-center text-xs text-muted">No student data available.</div>
                    )}
                  </div>
                </article>
              ))}
              {usedTeams.teams.length === 0 && (
                <div className="rounded-xl border border-dashed border-border px-5 py-16 text-center text-sm text-muted">
                  No team usage matches these filters.
                </div>
              )}
            </div>
            <Pagination
              page={usedTeams.page}
              pageCount={usedTeams.pageCount}
              loading={usedTeamsLoading}
              onPage={setPage}
            />
          </div>
        )
      )}
    </div>
  )
}
