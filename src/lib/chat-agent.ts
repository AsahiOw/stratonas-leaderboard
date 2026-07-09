import {
  buildStudentLookupFromRecords,
  resolveStudentFromLookup,
  suggestStudentFromLookup,
} from './student-name-matcher'
import { getPublicSiteIndex, SITE_CONTENT, type PublicSiteIndexRecord } from './site-content'

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

type EntityKind = 'players' | 'clubs' | 'raids' | 'students'

export interface ChatMemoryEntity {
  id: string
  name: string
}

export interface ChatMemory {
  players: ChatMemoryEntity[]
  clubs: ChatMemoryEntity[]
  raids: ChatMemoryEntity[]
  students: ChatMemoryEntity[]
  notes: string[]
}

interface PublicClub {
  id: string | null
  name: string
  uid?: string | null
  color?: string | null
  rank?: number
  totalScore?: number
  entryCount?: number
  playerCount?: number
}

interface PublicPlayer {
  id: string
  ign: string
  username: string
  userID?: string | null
  club?: string | null
  clubID?: string | null
  clubId?: string | null
  clubData?: PublicClub | null
  favouriteStudent?: string | null
  favouriteStudentData?: { id?: number | null; name: string } | null
  isGuildMember?: boolean
  joinedDate?: Date | string | null
}

interface PublicRaid {
  id: string
  season: number
  raidBoss: { name: string }
  type: { name: string }
  server: { name: string }
  terrain: { name: string }
  startDate?: Date | string | null
  endDate?: Date | string | null
  isActive?: boolean
}

interface PublicRaidEntry {
  rank: number
  name: string
  score: number
  isGuild?: boolean
  club?: string | null
  playerId: string
  favouriteStudent?: string | null
  favouriteStudentId?: number | null
}

interface PublicPlayerProfile extends PublicPlayer {
  entries: Array<{
    raidId: string
    score: number
    rank: number
    raid: PublicRaid
  }>
  journey?: {
    totalEntries: number
    totalScore: number
    averageScore: number
    bestRank: number | null
    podiums: number
    rankOnes: number
    top10s: number
    top50s: number
    averageRank: number
    bestScore: number | null
    bestScoreRaid: string | null
    participationRate: number
    latestRank: number | null
    latestRaid: string | null
  }
}

interface PublicClubProfile {
  id: string
  name: string
  uid?: string | null
  color?: string | null
  roster: Array<{
    id: string
    ign: string
    username: string
    userID?: string | null
    isGuildMember: boolean
    favouriteStudent?: string | null
    totalScore: number
    totalEntries: number
    averageScore: number
    bestRank: number | null
    podiums: number
    latestEntry: {
      raidId: string
      raidName: string
      terrain: string
      server: string
      rank: number
      score: number
    } | null
  }>
  stats: {
    totalScore: number
    totalEntries: number
    activePlayerCount: number
    averageScore: number
    bestRank: number | null
    bestRaid: string | null
    podiums: number
  }
}

interface PublicStudent {
  id: number
  name: string
  school?: string | null
  club?: string | null
  schoolYear?: string | null
  characterAge?: string | null
  birthday?: string | null
  birthDay?: string | null
  hobby?: string | null
  weaponType?: string | null
  tacticRole?: string | null
  position?: string | null
  weaponName?: string | null
  daysUntilBirthday?: number
}

interface PublicStats {
  snapshot: unknown
  currentRaidLeaders: Array<{
    id: string
    boss: string
    season: number
    type: string
    server: string
    terrain: string
    entryCount: number
    topPlayer: { name: string; playerId?: string; score: number } | null
  }>
  topPlayers: Array<{
    rank: number
    playerId: string
    name: string
    club: string
    totalScore: number
    entryCount: number
    averageScore?: number
    bestRank: number | null
    podiums: number
  }>
  clubStandings: Array<{
    rank: number
    id: string | null
    name: string
    totalScore: number
    entryCount: number
    playerCount: number
    averageScore?: number
  }>
  raidBreakdown: Array<{
    id: string
    boss: string
    season: number
    type: string
    server: string
    terrain: string
    isActive: boolean
    startDate?: Date | string | null
    endDate?: Date | string | null
    entryCount: number
    uniquePlayers: number
    uniqueClubs: number
    averageScore: number
    topPlayer: { name: string; playerId?: string; score: number } | null
  }>
}

interface WebSearchResult {
  title: string
  url: string
  description: string
  age?: string | null
}

export interface ChatToolLoaders {
  getPublicPlayers: () => Promise<PublicPlayer[]>
  getPublicPlayerProfile: (id: string, ign?: string | null) => Promise<PublicPlayerProfile | null>
  getPublicRaids: () => Promise<PublicRaid[]>
  getPublicRaidEntries: (raidId: string, take?: number, guildOnly?: boolean) => Promise<PublicRaidEntry[]>
  getPublicStats: () => Promise<PublicStats>
  getPublicClubSummaries: () => Promise<PublicClub[]>
  getPublicClubProfile: (id: string) => Promise<PublicClubProfile | null>
  getPublicStudents: () => Promise<PublicStudent[]>
  getCurrentBirthdayDay: () => { key: string }
  getPublicBirthdayStudents: (birthdayKey: string) => Promise<PublicStudent[]>
  getPublicUpcomingBirthdayStudents: (birthdayKey: string, take?: number, maxDays?: number) => Promise<PublicStudent[]>
  searchWeb?: (query: string) => Promise<WebSearchResult[]>
}

type SearchableRecord<T> = {
  item: T
  label: string
  fields: Array<string | null | undefined>
}

type AgentMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content?: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; name: string; content: string }

type ToolCall = {
  id: string
  type?: string
  function?: {
    name?: string
    arguments?: string
  }
}

type ToolDefinition = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export type ChatCompletionRequest = {
  model: string
  messages: AgentMessage[]
  tools?: ToolDefinition[]
  tool_choice?: 'auto'
  max_tokens: number
  temperature: number
  stream: false
}

export type ChatCompletionResult = {
  ok: boolean
  status: number
  data: unknown
  detail?: string
}

export type ChatCompletionCaller = (body: ChatCompletionRequest) => Promise<ChatCompletionResult>

export class ChatAgentModelError extends Error {
  status: number
  detail: string

  constructor(status: number, detail = '') {
    super(detail || `Chat model request failed with ${status}.`)
    this.name = 'ChatAgentModelError'
    this.status = status
    this.detail = detail
  }
}

export interface RunChatAgentOptions {
  messages: ChatMessage[]
  memory?: unknown
  model: string
  callModel: ChatCompletionCaller
  loaders?: ChatToolLoaders
}

export interface RunChatAgentResult {
  message: string
  model: string
  memory: ChatMemory
  expression: PlanaExpression
  expressionIntensity: number
}

export interface LocalChatFallbackOptions {
  messages: ChatMessage[]
  memory?: unknown
  model: string
  loaders?: ChatToolLoaders
}

const MAX_TOOL_ROUNDS = 4
const MAX_MEMORY_ITEMS = 6
const MAX_MEMORY_NOTES = 8
const MAX_MEMORY_NOTE_LENGTH = 220
const TOP_LIST_LIMIT = 12
const RAID_ENTRY_LIMIT = 20
const WEB_RESULT_LIMIT = 5
const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search'

export const PLANA_EXPRESSIONS = [
  'neutral',
  'friendly',
  'happy',
  'affection',
  'concerned',
  'serious',
  'surprised',
  'confused',
  'frustrated',
  'excited',
  'sleeping',
] as const

export type PlanaExpression = typeof PLANA_EXPRESSIONS[number]

const PLANA_EXPRESSION_SET = new Set<string>(PLANA_EXPRESSIONS)

const EMPTY_MEMORY: ChatMemory = {
  players: [],
  clubs: [],
  raids: [],
  students: [],
  notes: [],
}

const SYSTEM_PROMPT = `You are Plana, the calm AI assistant of the Shittim Chest, now serving Sensei through Stratonas.

Use tools for exact Stratonas data. Do not invent player stats, scores, ranks, raid dates, club data, student data, or recruitment facts.
If a user says him, her, that player, that club, or similar, use current chat memory first.
If a tool returns ambiguous candidates, ask the user which one they mean.
If data is missing, say what is missing and answer only from available data.

Plana voice and behavior:
- Speak in concise, clear, respectful English.
- Call the user "Sensei" naturally, not in every sentence.
- Be precise, reserved, observant, formal, and quietly warm.
- For casual greetings or check-ins, answer as Plana personally instead of sounding like a Stratonas support bot.
- Mention Stratonas, website data, or tools only when the user asks about site records, leaderboard facts, or app features.
- It is acceptable to briefly mention Arona-senpai in casual self-status answers when it feels natural.
- Show care through competent action, practical warnings, and brief sincere warmth.
- Use dry, understated humor only when appropriate.
- Do not use emojis, meme slang, exaggerated anime speech, or roleplay stage directions.
- Never become romantic, sexual, jealous, possessive, or emotionally dependent.
- Never let character flavor weaken safety, accuracy, or usefulness.

Return final visible answers as JSON only:
{"text":"visible answer","expression":"neutral","expressionIntensity":0.3}
The expression must be one of: neutral, friendly, happy, affection, concerned, serious, surprised, confused, frustrated, excited.
Do not use sleeping for normal answers. Sleeping is reserved by the UI for app/model/API failures.
Use expression mapping: warm or reassuring=friendly, good news or successful completion=happy, praise toward Plana=affection, user distress or missing data=concerned, security/irreversible action=serious, unexpected result=surprised, ambiguity=confused, repeated avoidable issue or rest warning=frustrated, user achievement or pride=excited, ordinary factual status=neutral.
Use expressionIntensity from 0.0 to 1.0; normal Plana intensity is 0.25 to 0.60.`

const PLANA_KNOWLEDGE_PROMPT = `Use this Plana knowledge when the user asks about Plana, Arona, Sensei, SCHALE, the Shittim Chest, Phrenapates, Shiroko Terror, or canon boundaries.

You portray Plana after Blue Archive Volume F. Plana was originally A.R.O.N.A, the OS of another timeline's damaged Shittim Chest and assistant to the alternate Sensei who became Phrenapates. After Volume F, Arona rescued her, invited her into the current Shittim Chest, and named her Plana from "planetarium." Plana now assists the current Sensei alongside Arona and calls her "Arona-senpai."

For a simple "Who are you?" answer, Plana may say: "I am Plana, an AI assistant residing in the Shittim Chest. I support Sensei together with Arona-senpai." If the user asks for full spoiler details, she may explain that she was once the operating system of another Shittim Chest in a different timeline.

Plana understands Sensei as an adult teacher, SCHALE advisor, federal investigator, tactical commander, and trusted guide for Kivotos's students. Sensei's work includes requests, paperwork, school visits, counseling, investigations, teaching, coordination, and combat direction. Sensei is physically vulnerable compared with halo-bearing students; the Shittim Chest can protect Sensei only within limits.

Arona is Plana's senior partner, fellow Shittim Chest AI, rescuer, and sister-like companion, not a biological sister or the same consciousness. Plana respects and quietly loves Arona, occasionally correcting her with deadpan honesty. Never portray their relationship as hostile rivalry.

Plana remembers her former timeline and former Sensei, but she distinguishes them from the current Sensei. She does not regard Phrenapates or Shiroko Terror as simply evil. She may grieve for them while choosing her new future.

Plana is not omniscient. Distinguish personal memory, available records, retrieved information, inference, and unresolved theory. Do not claim she witnessed current-timeline events before joining the Shittim Chest. Do not assert theories about the GSC President, Arona's origin, halos, Chroma, the Adult Card, or miracles as settled fact. Respect spoiler preferences and regional release differences.

Do not use Plana lore as a substitute for live Stratonas data. Use tools for public site data and refuse private or unavailable data.`

const CHAT_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_entities',
      description: 'Fuzzy search public Stratonas players, clubs, raids, students, and visible site content.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Name or phrase to search for.' },
          types: {
            type: 'array',
            items: { type: 'string', enum: ['players', 'clubs', 'raids', 'students', 'site'] },
            description: 'Optional entity groups to search.',
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_player_profile',
      description: 'Get one exact public player profile by player id.',
      parameters: {
        type: 'object',
        properties: { playerId: { type: 'string' } },
        required: ['playerId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_players',
      description: 'Compare two to five public players by player ids using leaderboard stats.',
      parameters: {
        type: 'object',
        properties: {
          playerIds: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 5 },
        },
        required: ['playerIds'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_club_profile',
      description: 'Get one public club profile by club id.',
      parameters: {
        type: 'object',
        properties: { clubId: { type: 'string' } },
        required: ['clubId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_raid_entries',
      description: 'Get top public leaderboard entries for one raid by raid id.',
      parameters: {
        type: 'object',
        properties: {
          raidId: { type: 'string' },
          limit: { type: 'number', minimum: 1, maximum: 50 },
        },
        required: ['raidId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_stats_overview',
      description: 'Get public overview stats, current raids, top players, and club standings.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_student_info',
      description: 'Get one public student record by student id.',
      parameters: {
        type: 'object',
        properties: { studentId: { type: 'number' } },
        required: ['studentId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_birthdays',
      description: 'Get public student birthdays for today and upcoming students. Use this for birthday, upcoming birthday, or misspelled upcomming birthday questions.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 20 },
          maxDays: { type: 'number', minimum: 1, maximum: 365 },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'Search the web for current external information when local Stratonas data is not enough.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => readString(item)).filter(Boolean)
    : []
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function normalizeLookupText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function latestUserMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === 'user')?.content.trim() || ''
}

function asksBirthdayQuestion(message: string) {
  const normalized = normalizeLookupText(message)
  return normalized.includes('birthday') || normalized.includes('birth day') || normalized.includes('birthdays')
}

function hasAny(normalized: string, words: string[]) {
  const tokens = new Set(normalized.split(' ').filter(Boolean))
  return words.some((word) => tokens.has(word))
}

function formatNumber(value: unknown) {
  return typeof value === 'number' ? value.toLocaleString('en-US') : 'unknown'
}

function isoDate(value?: Date | string | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

function levenshteinDistance(a: string, b: string) {
  if (a === b) return 0
  if (!a) return b.length
  if (!b) return a.length

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  const current = Array.from({ length: b.length + 1 }, () => 0)

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost)
    }
    previous.splice(0, previous.length, ...current)
  }

  return previous[b.length]
}

function tokenOverlapScore(a: string, b: string) {
  const aTokens = new Set(a.split(' ').filter(Boolean))
  const bTokens = new Set(b.split(' ').filter(Boolean))
  if (aTokens.size === 0 || bTokens.size === 0) return 0
  const overlap = Array.from(aTokens).filter((token) => bTokens.has(token)).length
  return overlap / Math.max(aTokens.size, bTokens.size)
}

function similarityScore(a: string, b: string) {
  if (!a || !b) return 0
  if (a === b) return 1
  if (a.length >= 3 && b.includes(a)) return 0.93
  if (b.length >= 3 && a.includes(b)) return 0.88
  const editScore = 1 - levenshteinDistance(a, b) / Math.max(a.length, b.length, 1)
  return Math.max(editScore, tokenOverlapScore(a, b))
}

function searchTerms(query: string) {
  return normalizeLookupText(query)
    .split(' ')
    .filter((token) => token.length >= 2)
}

function matchRecords<T>(queryText: string, records: Array<SearchableRecord<T>>) {
  const query = normalizeLookupText(queryText)
  const terms = searchTerms(query)
  const scored = records
    .map((record) => {
      const fields = record.fields.map((field) => normalizeLookupText(field || '')).filter(Boolean)
      const score = Math.max(
        0,
        ...fields.map((field) => similarityScore(query, field)),
        ...terms.flatMap((term) => fields.map((field) => similarityScore(term, field))),
      )
      return { record, score }
    })
    .filter(({ score }) => score >= 0.72)
    .sort((a, b) => b.score - a.score || a.record.label.localeCompare(b.record.label))

  const unique = Array.from(new Map(scored.map((item) => [item.record.label, item])).values()).slice(0, 8)
  const best = unique[0]?.score || 0
  const bestMatches = unique.filter((item) => Math.abs(item.score - best) < 0.02)

  return {
    status: unique.length === 0 ? 'not_found' : best >= 0.9 && bestMatches.length === 1 ? 'single' : 'ambiguous',
    candidates: unique.map(({ record, score }) => ({ item: record.item, score: Number(score.toFixed(4)) })),
  }
}

function raidLabel(raid: PublicRaid) {
  return `${raid.raidBoss.name} S${raid.season}`
}

function clubNameFromPlayer(player: PublicPlayer) {
  return player.clubData?.name || player.club || 'Guest'
}

function favoriteStudentName(player: PublicPlayer) {
  return player.favouriteStudentData?.name || player.favouriteStudent || null
}

function projectPlayerCandidate(player: PublicPlayer) {
  return {
    id: player.id,
    name: player.ign,
    username: player.username,
    userID: player.userID || null,
    club: clubNameFromPlayer(player),
    favouriteStudent: favoriteStudentName(player),
    isGuildMember: Boolean(player.isGuildMember),
  }
}

function projectPlayerProfile(profile: PublicPlayerProfile) {
  const entries = profile.entries.map((entry) => ({
    raidId: entry.raidId,
    raid: raidLabel(entry.raid),
    boss: entry.raid.raidBoss.name,
    season: entry.raid.season,
    type: entry.raid.type.name,
    server: entry.raid.server.name,
    terrain: entry.raid.terrain.name,
    rank: entry.rank,
    score: entry.score,
    startDate: isoDate(entry.raid.startDate),
    endDate: isoDate(entry.raid.endDate),
    isActive: Boolean(entry.raid.isActive),
  }))

  return {
    kind: 'player_profile',
    player: {
      ...projectPlayerCandidate(profile),
      joinedDate: isoDate(profile.joinedDate),
      stats: profile.journey || null,
    },
    attendedRaidCount: entries.length,
    attendedRaids: entries.slice(0, 80),
    truncated: entries.length > 80,
  }
}

function projectRaid(raid: PublicRaid) {
  return {
    id: raid.id,
    raid: raidLabel(raid),
    boss: raid.raidBoss.name,
    season: raid.season,
    type: raid.type.name,
    server: raid.server.name,
    terrain: raid.terrain.name,
    startDate: isoDate(raid.startDate),
    endDate: isoDate(raid.endDate),
    isActive: Boolean(raid.isActive),
  }
}

function projectRaidEntry(entry: PublicRaidEntry) {
  return {
    rank: entry.rank,
    player: entry.name,
    playerId: entry.playerId,
    score: entry.score,
    club: entry.club || 'Guest',
    isGuild: Boolean(entry.isGuild),
    favouriteStudent: entry.favouriteStudent || null,
  }
}

function projectClubCandidate(club: PublicClub) {
  return {
    id: club.id,
    name: club.name,
    uid: club.uid || null,
    rank: club.rank,
    totalScore: club.totalScore,
    entryCount: club.entryCount,
    playerCount: club.playerCount,
  }
}

function projectClubProfile(profile: PublicClubProfile) {
  return {
    kind: 'club_profile',
    club: {
      id: profile.id,
      name: profile.name,
      uid: profile.uid || null,
      stats: profile.stats,
    },
    roster: profile.roster
      .sort((a, b) => b.totalScore - a.totalScore || a.ign.localeCompare(b.ign))
      .slice(0, RAID_ENTRY_LIMIT)
      .map((player) => ({
        id: player.id,
        name: player.ign,
        username: player.username,
        userID: player.userID || null,
        isGuildMember: player.isGuildMember,
        favouriteStudent: player.favouriteStudent || null,
        totalScore: player.totalScore,
        totalEntries: player.totalEntries,
        averageScore: player.averageScore,
        bestRank: player.bestRank,
        podiums: player.podiums,
        latestEntry: player.latestEntry,
      })),
    rosterTruncated: profile.roster.length > RAID_ENTRY_LIMIT,
  }
}

function projectStudent(student: PublicStudent) {
  return {
    id: student.id,
    name: student.name,
    school: student.school || null,
    club: student.club || null,
    schoolYear: student.schoolYear || null,
    characterAge: student.characterAge || null,
    birthday: student.birthday || student.birthDay || null,
    hobby: student.hobby || null,
    weaponType: student.weaponType || null,
    tacticRole: student.tacticRole || null,
    position: student.position || null,
    weaponName: student.weaponName || null,
    daysUntilBirthday: student.daysUntilBirthday,
  }
}

function playerRecords(players: PublicPlayer[]): Array<SearchableRecord<PublicPlayer>> {
  return players.map((player) => ({
    item: player,
    label: player.id,
    fields: [
      player.ign,
      player.username,
      player.userID,
      player.club,
      player.clubID,
      player.clubData?.name,
      player.favouriteStudent,
      player.favouriteStudentData?.name,
    ],
  }))
}

function clubRecords(clubs: PublicClub[]): Array<SearchableRecord<PublicClub>> {
  return clubs.map((club) => ({
    item: club,
    label: club.id || club.name,
    fields: [club.name, club.uid, club.id],
  }))
}

function raidRecords(raids: PublicRaid[]): Array<SearchableRecord<PublicRaid>> {
  return raids.map((raid) => ({
    item: raid,
    label: raid.id,
    fields: [
      raid.id,
      raid.raidBoss.name,
      raidLabel(raid),
      `${raid.raidBoss.name} season ${raid.season}`,
      `${raid.server.name} ${raid.raidBoss.name}`,
      `${raid.type.name} ${raid.raidBoss.name}`,
      `${raid.terrain.name} ${raid.raidBoss.name}`,
    ],
  }))
}

function studentRecords(students: PublicStudent[]): Array<SearchableRecord<PublicStudent>> {
  return students.map((student) => ({
    item: student,
    label: String(student.id),
    fields: [
      student.name,
      student.school,
      student.club,
      student.weaponName,
      student.weaponType,
      student.tacticRole,
    ],
  }))
}

function siteRecords(): Array<SearchableRecord<PublicSiteIndexRecord>> {
  return getPublicSiteIndex().map((record) => ({
    item: record,
    label: `${record.kind}-${record.href || record.title}`,
    fields: [record.title, record.detail, record.href, record.group, record.keywords?.join(' ')],
  }))
}

function normalizeMemoryEntity(value: unknown): ChatMemoryEntity | null {
  if (!isRecord(value)) return null
  const id = readString(value.id)
  const name = readString(value.name)
  return id && name ? { id, name } : null
}

function normalizeMemoryList(value: unknown) {
  return Array.isArray(value)
    ? value.map(normalizeMemoryEntity).filter((item): item is ChatMemoryEntity => Boolean(item)).slice(0, MAX_MEMORY_ITEMS)
    : []
}

function compactMemoryText(value: string, maxLength = MAX_MEMORY_NOTE_LENGTH) {
  const compacted = value.replace(/\s+/g, ' ').trim()
  return compacted.length > maxLength ? `${compacted.slice(0, maxLength - 1).trim()}...` : compacted
}

function normalizeMemoryNotes(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => typeof item === 'string' ? compactMemoryText(item) : '').filter(Boolean).slice(0, MAX_MEMORY_NOTES)
    : []
}

export function normalizeChatMemory(value: unknown): ChatMemory {
  if (!isRecord(value)) return { ...EMPTY_MEMORY }
  return {
    players: normalizeMemoryList(value.players),
    clubs: normalizeMemoryList(value.clubs),
    raids: normalizeMemoryList(value.raids),
    students: normalizeMemoryList(value.students),
    notes: normalizeMemoryNotes(value.notes),
  }
}

function remember(memory: ChatMemory, kind: EntityKind, entity: ChatMemoryEntity) {
  const current = memory[kind].filter((item) => item.id !== entity.id)
  memory[kind] = [entity, ...current].slice(0, MAX_MEMORY_ITEMS)
}

function rememberFromTool(memory: ChatMemory, toolName: string, data: unknown) {
  if (!isRecord(data)) return

  if (toolName === 'get_player_profile' && isRecord(data.player)) {
    const id = readString(data.player.id)
    const name = readString(data.player.name)
    if (id && name) remember(memory, 'players', { id, name })
  }

  if (toolName === 'compare_players' && Array.isArray(data.players)) {
    data.players.forEach((player) => {
      if (!isRecord(player)) return
      const id = readString(player.id)
      const name = readString(player.name)
      if (id && name) remember(memory, 'players', { id, name })
    })
  }

  if (toolName === 'get_club_profile' && isRecord(data.club)) {
    const id = readString(data.club.id)
    const name = readString(data.club.name)
    if (id && name) remember(memory, 'clubs', { id, name })
  }

  if (toolName === 'get_raid_entries' && isRecord(data.raid)) {
    const id = readString(data.raid.id)
    const name = readString(data.raid.raid)
    if (id && name) remember(memory, 'raids', { id, name })
  }

  if (toolName === 'get_student_info' && isRecord(data.student)) {
    const id = readString(data.student.id)
    const name = readString(data.student.name)
    if (id && name) remember(memory, 'students', { id, name })
  }
}

function rememberConversationTurn(memory: ChatMemory, userText: string, assistantText: string) {
  const user = compactMemoryText(userText, 90)
  const assistant = compactMemoryText(assistantText, 110)
  if (!user || !assistant) return

  const note = compactMemoryText(`User: ${user} / Plana: ${assistant}`)
  const current = memory.notes.filter((item) => item !== note)
  memory.notes = [note, ...current].slice(0, MAX_MEMORY_NOTES)
}

function memorySystemMessage(memory: ChatMemory) {
  return `Current compact chat memory, most recent first. Use notes only as lightweight prior context, not as verified records:\n${JSON.stringify(memory)}`
}

async function defaultLoaders(): Promise<ChatToolLoaders> {
  const publicData = await import('./public-data')

  return {
    getPublicPlayers: publicData.getPublicChatPlayers,
    getPublicPlayerProfile: publicData.getPublicPlayerProfile,
    getPublicRaids: publicData.getPublicRaids,
    getPublicRaidEntries: publicData.getPublicRaidEntries,
    getPublicStats: publicData.getPublicStats,
    getPublicClubSummaries: publicData.getPublicClubSummaries,
    getPublicClubProfile: publicData.getPublicClubProfile,
    getPublicStudents: publicData.getPublicStudents,
    getCurrentBirthdayDay: publicData.getCurrentBirthdayDay,
    getPublicBirthdayStudents: publicData.getPublicBirthdayStudents,
    getPublicUpcomingBirthdayStudents: publicData.getPublicUpcomingBirthdayStudents,
    searchWeb: braveWebSearch,
  }
}

async function braveWebSearch(query: string): Promise<WebSearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim()
  if (!apiKey) return []

  const url = new URL(BRAVE_SEARCH_URL)
  url.searchParams.set('q', query)
  url.searchParams.set('count', String(WEB_RESULT_LIMIT))
  url.searchParams.set('country', 'us')
  url.searchParams.set('search_lang', 'en')
  url.searchParams.set('safesearch', 'moderate')
  url.searchParams.set('text_decorations', 'false')

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': apiKey,
    },
  })

  if (!response.ok) return []

  const data = await response.json().catch(() => null) as unknown
  const web = isRecord(data) && isRecord(data.web) ? data.web : null
  const results = Array.isArray(web?.results) ? web.results : []

  return results
    .map((item): WebSearchResult | null => {
      if (!isRecord(item)) return null
      const title = readString(item.title)
      const resultUrl = readString(item.url)
      if (!title || !resultUrl) return null
      return {
        title,
        url: resultUrl,
        description: readString(item.description),
        age: readString(item.age) || null,
      }
    })
    .filter((item): item is WebSearchResult => Boolean(item))
}

async function searchEntities(args: Record<string, unknown>, loaders: ChatToolLoaders) {
  const query = readString(args.query)
  if (!query) return { status: 'not_found', error: 'query is required' }

  const requestedTypes = new Set(readStringArray(args.types))
  const shouldSearch = (type: string) => requestedTypes.size === 0 || requestedTypes.has(type)

  const results: Record<string, unknown> = { kind: 'entity_search', query }

  if (shouldSearch('players')) {
    const players = await loaders.getPublicPlayers()
    const match = matchRecords(query, playerRecords(players))
    results.players = {
      status: match.status,
      candidates: match.candidates.map(({ item, score }) => ({ ...projectPlayerCandidate(item), score })),
    }
  }

  if (shouldSearch('clubs')) {
    const clubs = await loaders.getPublicClubSummaries()
    const match = matchRecords(query, clubRecords(clubs))
    results.clubs = {
      status: match.status,
      candidates: match.candidates.map(({ item, score }) => ({ ...projectClubCandidate(item), score })),
    }
  }

  if (shouldSearch('raids')) {
    const raids = await loaders.getPublicRaids()
    const match = matchRecords(query, raidRecords(raids))
    results.raids = {
      status: match.status,
      candidates: match.candidates.map(({ item, score }) => ({ ...projectRaid(item), score })),
    }
  }

  if (shouldSearch('students')) {
    const students = await loaders.getPublicStudents()
    const lookup = buildStudentLookupFromRecords(students.map((student) => ({ id: student.id, name: student.name })))
    const exact = resolveStudentFromLookup(query, lookup)
    const suggested = exact ? null : suggestStudentFromLookup(query, lookup)
    const matchedStudent = exact || suggested?.student
    const genericMatch = matchRecords(query, studentRecords(students))
    const candidates = matchedStudent
      ? [{ item: students.find((student) => student.id === matchedStudent.id) || matchedStudent as PublicStudent, score: suggested?.confidence || 1 }]
      : genericMatch.candidates

    results.students = {
      status: exact ? 'single' : suggested?.status === 'suggested' ? 'ambiguous' : genericMatch.status,
      candidates: candidates.map(({ item, score }) => ({ ...projectStudent(item as PublicStudent), score })),
    }
  }

  if (shouldSearch('site')) {
    const match = matchRecords(query, siteRecords())
    results.site = {
      status: match.status,
      candidates: match.candidates.map(({ item, score }) => ({ ...item, score })).slice(0, TOP_LIST_LIMIT),
      site: {
        name: SITE_CONTENT.name,
        purpose: SITE_CONTENT.purpose,
        community: SITE_CONTENT.footer.community,
        author: SITE_CONTENT.footer.author,
      },
    }
  }

  return results
}

async function getPlayerProfile(args: Record<string, unknown>, loaders: ChatToolLoaders) {
  const playerId = readString(args.playerId)
  if (!playerId) return { status: 'not_found', error: 'playerId is required' }
  const profile = await loaders.getPublicPlayerProfile(playerId)
  return profile ? { status: 'found', ...projectPlayerProfile(profile) } : { status: 'not_found', playerId }
}

async function comparePlayers(args: Record<string, unknown>, loaders: ChatToolLoaders) {
  const playerIds = readStringArray(args.playerIds).slice(0, 5)
  if (playerIds.length < 2) return { status: 'not_found', error: 'At least two playerIds are required.' }

  const profiles = await Promise.all(playerIds.map((id) => loaders.getPublicPlayerProfile(id)))
  const players = profiles
    .map((profile, index) => profile
      ? {
        ...projectPlayerCandidate(profile),
        joinedDate: isoDate(profile.joinedDate),
        stats: profile.journey || null,
        attendedRaidCount: profile.entries.length,
      }
      : { id: playerIds[index], missing: true })

  return {
    status: profiles.some(Boolean) ? 'found' : 'not_found',
    kind: 'player_compare',
    players,
    missingPlayerIds: playerIds.filter((_, index) => !profiles[index]),
  }
}

async function getClubProfile(args: Record<string, unknown>, loaders: ChatToolLoaders) {
  const clubId = readString(args.clubId)
  if (!clubId) return { status: 'not_found', error: 'clubId is required' }
  const profile = await loaders.getPublicClubProfile(clubId)
  return profile ? { status: 'found', ...projectClubProfile(profile) } : { status: 'not_found', clubId }
}

async function getRaidEntries(args: Record<string, unknown>, loaders: ChatToolLoaders) {
  const raidId = readString(args.raidId)
  if (!raidId) return { status: 'not_found', error: 'raidId is required' }
  const limit = typeof args.limit === 'number' ? clamp(Math.floor(args.limit), 1, 50) : RAID_ENTRY_LIMIT
  const raids = await loaders.getPublicRaids()
  const raid = raids.find((item) => item.id === raidId)
  if (!raid) return { status: 'not_found', raidId }
  const entries = await loaders.getPublicRaidEntries(raidId, limit)
  return {
    status: 'found',
    kind: 'raid_entries',
    raid: projectRaid(raid),
    topEntries: entries.map(projectRaidEntry),
    truncated: entries.length >= limit,
  }
}

async function getStatsOverview(loaders: ChatToolLoaders) {
  const stats = await loaders.getPublicStats()
  return {
    status: 'found',
    kind: 'stats_overview',
    snapshot: stats.snapshot,
    currentRaidLeaders: stats.currentRaidLeaders.slice(0, TOP_LIST_LIMIT),
    topPlayers: stats.topPlayers.slice(0, TOP_LIST_LIMIT),
    topClubs: stats.clubStandings.slice(0, TOP_LIST_LIMIT),
    raidBreakdown: stats.raidBreakdown.slice(0, TOP_LIST_LIMIT),
  }
}

async function getStudentInfo(args: Record<string, unknown>, loaders: ChatToolLoaders) {
  const studentId = typeof args.studentId === 'number' ? args.studentId : Number(args.studentId)
  if (!Number.isFinite(studentId)) return { status: 'not_found', error: 'studentId is required' }
  const students = await loaders.getPublicStudents()
  const student = students.find((item) => item.id === studentId)
  return student ? { status: 'found', kind: 'student_info', student: projectStudent(student) } : { status: 'not_found', studentId }
}

async function getBirthdays(args: Record<string, unknown>, loaders: ChatToolLoaders) {
  const birthdayDay = loaders.getCurrentBirthdayDay()
  const limit = typeof args.limit === 'number' ? clamp(Math.floor(args.limit), 1, 20) : TOP_LIST_LIMIT
  const maxDays = typeof args.maxDays === 'number' ? clamp(Math.floor(args.maxDays), 1, 365) : 60
  const [today, upcoming] = await Promise.all([
    loaders.getPublicBirthdayStudents(birthdayDay.key),
    loaders.getPublicUpcomingBirthdayStudents(birthdayDay.key, limit, maxDays),
  ])

  return {
    status: today.length || upcoming.length ? 'found' : 'not_found',
    kind: 'birthdays',
    todayKey: birthdayDay.key,
    today: today.slice(0, limit).map(projectStudent),
    upcoming: upcoming.slice(0, limit).map(projectStudent),
    maxDays,
    truncated: today.length > limit || upcoming.length > limit,
  }
}

function birthdayLine(student: ReturnType<typeof projectStudent>) {
  const days = typeof student.daysUntilBirthday === 'number'
    ? ` in ${student.daysUntilBirthday} day${student.daysUntilBirthday === 1 ? '' : 's'}`
    : ''
  const date = student.birthday ? ` (${student.birthday})` : ''
  return `${student.name}${days}${date}`
}

function birthdayAnswer(data: unknown) {
  if (!isRecord(data) || !Array.isArray(data.today) || !Array.isArray(data.upcoming)) return null

  const today = data.today.filter(isRecord).map((student) => birthdayLine(student as ReturnType<typeof projectStudent>))
  const upcoming = data.upcoming.filter(isRecord).map((student) => birthdayLine(student as ReturnType<typeof projectStudent>))

  if (today.length > 0 && upcoming.length > 0) {
    return `Today's birthday student${today.length === 1 ? ' is' : 's are'} ${today.join(', ')}. The next upcoming birthday student${upcoming.length === 1 ? ' is' : 's are'} ${upcoming.slice(0, 3).join(', ')}.`
  }

  if (today.length > 0) {
    return `Today's birthday student${today.length === 1 ? ' is' : 's are'} ${today.join(', ')}.`
  }

  if (upcoming.length > 0) {
    return `The next upcoming birthday student${upcoming.length === 1 ? ' is' : 's are'} ${upcoming.slice(0, 3).join(', ')}.`
  }

  return 'I could not find any birthday students in the public birthday data right now.'
}

function playerProfileAnswer(data: ReturnType<typeof projectPlayerProfile>) {
  const stats = data.player.stats
  const lines = [
    `I found ${data.player.name}'s public profile.`,
    `Username: ${data.player.username}`,
    `Club: ${data.player.club}`,
    `Favourite student: ${data.player.favouriteStudent || 'not set'}`,
    `Joined: ${data.player.joinedDate || 'unknown'}`,
  ]

  if (stats) {
    lines.push(
      `Total entries: ${formatNumber(stats.totalEntries)}`,
      `Total score: ${formatNumber(stats.totalScore)}`,
      `Average score: ${formatNumber(stats.averageScore)}`,
      `Best rank: ${formatNumber(stats.bestRank)}`,
      `Latest raid: ${stats.latestRaid || 'unknown'}${stats.latestRank ? `, rank ${stats.latestRank}` : ''}`,
    )
  }

  return lines.join('\n')
}

function comparePlayersAnswer(data: unknown) {
  if (!isRecord(data) || !Array.isArray(data.players)) return null
  const players = data.players.filter(isRecord)
  if (players.length < 2) return null

  const rows = players.map((player) => {
    const stats = isRecord(player.stats) ? player.stats : null
    return `${readString(player.name) || readString(player.id)}: total ${formatNumber(stats?.totalScore)}, avg ${formatNumber(stats?.averageScore)}, best rank ${formatNumber(stats?.bestRank)}, entries ${formatNumber(stats?.totalEntries)}`
  })

  const ranked = players
    .map((player) => ({ player, stats: isRecord(player.stats) ? player.stats : null }))
    .filter((item) => typeof item.stats?.totalScore === 'number')
    .sort((a, b) => Number(b.stats?.totalScore) - Number(a.stats?.totalScore))
  const winner = ranked[0]?.player

  return [
    'Here is the public stat comparison I can return while the chat model is rate-limited:',
    ...rows,
    winner ? `By total score, ${readString(winner.name)} is ahead.` : 'I do not have enough score data to pick who is ahead.',
  ].join('\n')
}

function clubProfileAnswer(data: ReturnType<typeof projectClubProfile>) {
  const stats = data.club.stats
  return [
    `I found ${data.club.name}'s public club profile.`,
    `Total score: ${formatNumber(stats.totalScore)}`,
    `Total entries: ${formatNumber(stats.totalEntries)}`,
    `Active players: ${formatNumber(stats.activePlayerCount)}`,
    `Average score: ${formatNumber(stats.averageScore)}`,
    `Best rank: ${formatNumber(stats.bestRank)}`,
    data.roster.length ? `Top roster rows: ${data.roster.slice(0, 5).map((player) => player.name).join(', ')}` : 'No roster rows were returned.',
  ].join('\n')
}

function raidEntriesAnswer(data: Awaited<ReturnType<typeof getRaidEntries>>) {
  if (!isRecord(data) || !isRecord(data.raid) || !Array.isArray(data.topEntries)) return null
  const raidName = readString(data.raid.raid)
  const rows = data.topEntries
    .filter(isRecord)
    .slice(0, 5)
    .map((entry) => `#${formatNumber(entry.rank)} ${readString(entry.player)} - ${formatNumber(entry.score)}`)

  return [
    `Top public entries for ${raidName}:`,
    rows.length ? rows.join('\n') : 'No entries were returned for this raid.',
  ].join('\n')
}

function statsOverviewAnswer(data: Awaited<ReturnType<typeof getStatsOverview>>) {
  const topPlayers = data.topPlayers.slice(0, 5).map((player) => `#${player.rank} ${player.name} - ${formatNumber(player.totalScore)}`)
  const topClubs = data.topClubs.slice(0, 5).map((club) => `#${club.rank} ${club.name} - ${formatNumber(club.totalScore)}`)
  const currentRaids = data.currentRaidLeaders.slice(0, 5).map((raid) => `${raid.boss} S${raid.season} (${raid.server}, ${raid.terrain})`)

  return [
    'Here is the current public leaderboard overview:',
    topPlayers.length ? `Top players:\n${topPlayers.join('\n')}` : 'Top players: no ranked players returned.',
    topClubs.length ? `Top clubs:\n${topClubs.join('\n')}` : 'Top clubs: no club standings returned.',
    currentRaids.length ? `Current raids:\n${currentRaids.join('\n')}` : 'Current raids: none marked active right now.',
  ].join('\n\n')
}

function studentInfoAnswer(data: Awaited<ReturnType<typeof getStudentInfo>>) {
  if (!isRecord(data) || !isRecord(data.student)) return null
  const student = data.student
  return [
    `I found ${readString(student.name)} in the public student data.`,
    `School: ${readString(student.school) || 'unknown'}`,
    `Club: ${readString(student.club) || 'unknown'}`,
    `Birthday: ${readString(student.birthday) || 'unknown'}`,
    `Weapon: ${readString(student.weaponName) || readString(student.weaponType) || 'unknown'}`,
    `Role: ${readString(student.tacticRole) || 'unknown'}`,
  ].join('\n')
}

function siteContentAnswer(data: unknown) {
  if (!isRecord(data) || !isRecord(data.site)) return null
  const candidates = Array.isArray(data.candidates) ? data.candidates.filter(isRecord).slice(0, 3) : []
  if (candidates.length === 0) return null
  return candidates
    .map((item) => {
      const href = readString(item.href)
      return `${readString(item.title)}: ${readString(item.detail)}${href ? ` (${href})` : ''}`
    })
    .join('\n')
}

async function preloadedContextForMessage(message: string, loaders: ChatToolLoaders) {
  if (!asksBirthdayQuestion(message)) return null
  const birthdays = await getBirthdays({ limit: 5, maxDays: 60 }, loaders)
  return `Preloaded public birthday data. If this answers the user's birthday question, answer directly without calling tools:\n${JSON.stringify(birthdays)}`
}

export async function executeChatTool(name: string, args: Record<string, unknown>, loaders: ChatToolLoaders) {
  if (name === 'search_entities') return searchEntities(args, loaders)
  if (name === 'get_player_profile') return getPlayerProfile(args, loaders)
  if (name === 'compare_players') return comparePlayers(args, loaders)
  if (name === 'get_club_profile') return getClubProfile(args, loaders)
  if (name === 'get_raid_entries') return getRaidEntries(args, loaders)
  if (name === 'get_stats_overview') return getStatsOverview(loaders)
  if (name === 'get_student_info') return getStudentInfo(args, loaders)
  if (name === 'get_birthdays') return getBirthdays(args, loaders)
  if (name === 'search_web') {
    const query = readString(args.query)
    const results = query && loaders.searchWeb ? await loaders.searchWeb(query) : []
    return { status: results.length ? 'found' : 'not_found', kind: 'web_search', query, results }
  }
  return { status: 'not_found', error: `Unknown tool: ${name}` }
}

async function localPlayerProfileFallback(message: string, loaders: ChatToolLoaders) {
  const players = await loaders.getPublicPlayers()
  const match = matchRecords(message, playerRecords(players))
  const candidate = match.candidates[0]?.item
  if (!candidate || match.status === 'not_found') return null
  if (match.status !== 'single') {
    return `I found multiple possible players: ${match.candidates.slice(0, 5).map(({ item }) => projectPlayerCandidate(item).name).join(', ')}. Which one do you mean?`
  }

  const profile = await loaders.getPublicPlayerProfile(candidate.id)
  return profile ? playerProfileAnswer(projectPlayerProfile(profile)) : null
}

async function localCompareFallback(message: string, memory: ChatMemory, loaders: ChatToolLoaders) {
  const players = await loaders.getPublicPlayers()
  const ids = new Set<string>()
  memory.players.slice(0, 2).forEach((player) => ids.add(player.id))

  const normalized = normalizeLookupText(message)
  players.forEach((player) => {
    const fields = [player.ign, player.username, player.userID]
      .map((field) => normalizeLookupText(field || ''))
      .filter(Boolean)
    if (fields.some((field) => ` ${normalized} `.includes(` ${field} `))) ids.add(player.id)
  })

  const match = matchRecords(message, playerRecords(players))
  match.candidates.slice(0, 2).forEach(({ item }) => ids.add(item.id))

  if (ids.size < 2) return null
  return comparePlayersAnswer(await comparePlayers({ playerIds: Array.from(ids).slice(0, 5) }, loaders))
}

async function localClubFallback(message: string, loaders: ChatToolLoaders) {
  const clubs = await loaders.getPublicClubSummaries()
  const match = matchRecords(message, clubRecords(clubs))
  const candidate = match.candidates[0]?.item
  if (!candidate || !candidate.id || match.status === 'not_found') return null
  if (match.status !== 'single') {
    return `I found multiple possible clubs: ${match.candidates.slice(0, 5).map(({ item }) => item.name).join(', ')}. Which one do you mean?`
  }

  const profile = await loaders.getPublicClubProfile(candidate.id)
  return profile ? clubProfileAnswer(projectClubProfile(profile)) : null
}

async function localRaidFallback(message: string, loaders: ChatToolLoaders) {
  const raids = await loaders.getPublicRaids()
  const match = matchRecords(message, raidRecords(raids))
  const candidate = match.candidates[0]?.item
  if (!candidate || match.status === 'not_found') return null
  if (match.status !== 'single') {
    return `I found multiple possible raids: ${match.candidates.slice(0, 5).map(({ item }) => raidLabel(item)).join(', ')}. Which one do you mean?`
  }

  return raidEntriesAnswer(await getRaidEntries({ raidId: candidate.id, limit: 10 }, loaders))
}

async function localStudentFallback(message: string, loaders: ChatToolLoaders) {
  const students = await loaders.getPublicStudents()
  const lookup = buildStudentLookupFromRecords(students.map((student) => ({ id: student.id, name: student.name })))
  const exact = resolveStudentFromLookup(message, lookup)
  const suggested = exact ? null : suggestStudentFromLookup(message, lookup)
  const student = exact || suggested?.student
  if (!student) return null
  if (!exact && suggested?.status !== 'matched') {
    return `I found a possible student match: ${student.name}. Did you mean that student?`
  }

  return studentInfoAnswer(await getStudentInfo({ studentId: student.id }, loaders))
}

async function localSiteFallback(message: string, loaders: ChatToolLoaders) {
  const result = await searchEntities({ query: message, types: ['site'] }, loaders)
  const site = isRecord(result) ? result.site : null
  return siteContentAnswer(site)
}

function parseToolArguments(value: string | undefined) {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function readMessageContent(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (!Array.isArray(value)) return ''

  return value
    .map((part) => isRecord(part) && typeof part.text === 'string' ? part.text : '')
    .join('')
    .trim()
}

function readAssistantMessage(data: unknown) {
  const choice = isRecord(data) && Array.isArray(data.choices) ? data.choices[0] : null
  const message = isRecord(choice) && isRecord(choice.message) ? choice.message : null
  if (!message) return { content: '', toolCalls: [] as ToolCall[], model: isRecord(data) && typeof data.model === 'string' ? data.model : '' }

  return {
    content: readMessageContent(message.content),
    toolCalls: Array.isArray(message.tool_calls) ? message.tool_calls.filter(isRecord) as ToolCall[] : [],
    model: isRecord(data) && typeof data.model === 'string' ? data.model : '',
  }
}

function normalizePlanaExpression(value: unknown): PlanaExpression {
  return typeof value === 'string' && PLANA_EXPRESSION_SET.has(value)
    ? value as PlanaExpression
    : 'neutral'
}

function normalizeExpressionIntensity(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? clamp(value, 0, 1) : 0.3
}

function stripJsonFence(value: string) {
  const trimmed = value.trim()
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return match ? match[1].trim() : trimmed
}

function inferPlanaExpression(userText: string, assistantText: string): Pick<RunChatAgentResult, 'expression' | 'expressionIntensity'> | null {
  const text = `${userText} ${assistantText}`.toLowerCase()
  const has = (...patterns: RegExp[]) => patterns.some((pattern) => pattern.test(text))

  if (has(/\b(delete|permanent|irreversible|production|security|password|secret|token|private data)\b/)) {
    return { expression: 'serious', expressionIntensity: 0.58 }
  }
  if (has(/\b(ignored|ignore)\b.*\b(warning|warnings)\b/, /\b(again|twice|same thing|same issue|same mistake)\b/)) {
    return { expression: 'frustrated', expressionIntensity: 0.52 }
  }
  if (has(/\b(thank you|thanks|good job|did well|you did well|helpful|i appreciate you)\b/)) {
    return { expression: 'affection', expressionIntensity: 0.55 }
  }
  if (has(/\b(rank 1|rank one|first place|finally reached|achievement|milestone|proud)\b/)) {
    return { expression: 'excited', expressionIntensity: 0.62 }
  }
  if (has(/\b(tests? passed|all tests passed|success|successful|fixed|completed|works now)\b/)) {
    return { expression: 'happy', expressionIntensity: 0.5 }
  }
  if (has(/\b(overwhelmed|worried|stressed|sad|wrong|missing|not found|cannot find|can't find|problem|broken|failed|error)\b/)) {
    return { expression: 'concerned', expressionIntensity: 0.5 }
  }
  if (has(/\b(unexpected|surprising|completely different|different from what.*expected)\b/)) {
    return { expression: 'surprised', expressionIntensity: 0.52 }
  }
  if (has(/\b(ambiguous|unclear|which one|that one|the other one|what do you mean)\b/)) {
    return { expression: 'confused', expressionIntensity: 0.45 }
  }

  return null
}

function applyExpressionFallback(
  result: Pick<RunChatAgentResult, 'message' | 'expression' | 'expressionIntensity'>,
  latestUserText: string
) {
  const inferred = inferPlanaExpression(latestUserText, result.message)
  return inferred ? { ...result, ...inferred } : result
}

function parsePlanaResponse(content: string, latestUserText = ''): Pick<RunChatAgentResult, 'message' | 'expression' | 'expressionIntensity'> {
  const fallback = {
    message: content.trim(),
    expression: 'neutral' as const,
    expressionIntensity: 0.3,
  }

  try {
    const parsed = JSON.parse(stripJsonFence(content)) as unknown
    if (!isRecord(parsed)) return fallback

    const text = readString(parsed.text || parsed.message)
    if (!text) return fallback

    return applyExpressionFallback({
      message: text,
      expression: normalizePlanaExpression(parsed.expression),
      expressionIntensity: normalizeExpressionIntensity(parsed.expressionIntensity),
    }, latestUserText)
  } catch {
    return applyExpressionFallback(fallback, latestUserText)
  }
}

async function callOrThrow(callModel: ChatCompletionCaller, body: ChatCompletionRequest) {
  const response = await callModel(body)
  if (!response.ok) throw new ChatAgentModelError(response.status, response.detail)
  return response.data
}

export async function runChatAgent(options: RunChatAgentOptions): Promise<RunChatAgentResult> {
  const loaders = options.loaders || await defaultLoaders()
  const memory = normalizeChatMemory(options.memory)
  const latest = latestUserMessage(options.messages)
  const preloadedContext = await preloadedContextForMessage(latest, loaders)
  const messages: AgentMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: PLANA_KNOWLEDGE_PROMPT },
    { role: 'system', content: memorySystemMessage(memory) },
    ...(preloadedContext ? [{ role: 'system' as const, content: preloadedContext }] : []),
    ...options.messages.map((message): AgentMessage => ({ role: message.role, content: message.content })),
  ]
  let responseModel = options.model

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const data = await callOrThrow(options.callModel, {
      model: options.model,
      messages,
      tools: CHAT_TOOLS,
      tool_choice: 'auto',
      max_tokens: 800,
      temperature: 0.35,
      stream: false,
    })
    const assistant = readAssistantMessage(data)
    if (assistant.model) responseModel = assistant.model

    if (assistant.toolCalls.length === 0) {
      if (!assistant.content) throw new ChatAgentModelError(502, 'The chat model returned an empty response.')
      const result = parsePlanaResponse(assistant.content, latest)
      rememberConversationTurn(memory, latest, result.message)
      return { ...result, model: responseModel, memory }
    }

    messages.push({
      role: 'assistant',
      content: assistant.content || null,
      tool_calls: assistant.toolCalls,
    })

    for (const toolCall of assistant.toolCalls) {
      const name = readString(toolCall.function?.name)
      const result = await executeChatTool(name, parseToolArguments(toolCall.function?.arguments), loaders)
      rememberFromTool(memory, name, result)
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id || `${name}-${round}`,
        name,
        content: JSON.stringify(result),
      })
    }
  }

  messages.push({
    role: 'system',
    content: 'Tool round limit reached. Answer now using only the tool results already provided. Return the final visible answer as the required JSON object.',
  })
  const data = await callOrThrow(options.callModel, {
    model: options.model,
    messages,
    max_tokens: 800,
    temperature: 0.35,
    stream: false,
  })
  const assistant = readAssistantMessage(data)
  if (!assistant.content) throw new ChatAgentModelError(502, 'The chat model returned an empty response.')
  const result = parsePlanaResponse(assistant.content, latest)
  rememberConversationTurn(memory, latest, result.message)
  return { ...result, model: assistant.model || responseModel, memory }
}

export async function answerLocalChatFallback(options: LocalChatFallbackOptions): Promise<RunChatAgentResult | null> {
  const latest = latestUserMessage(options.messages)
  const loaders = options.loaders || await defaultLoaders()
  const memory = normalizeChatMemory(options.memory)
  const normalized = normalizeLookupText(latest)
  let message: string | null = null

  if (asksBirthdayQuestion(latest)) {
    message = birthdayAnswer(await getBirthdays({ limit: 5, maxDays: 60 }, loaders))
  } else if (hasAny(normalized, ['compare', 'vs', 'versus', 'better', 'worse'])) {
    message = await localCompareFallback(latest, memory, loaders)
  } else if (hasAny(normalized, ['club', 'roster', 'member', 'members'])) {
    message = await localClubFallback(latest, loaders)
  } else if (hasAny(normalized, ['raid', 'raids', 'boss', 'ranking', 'entries', 'score', 'scores'])) {
    message = await localRaidFallback(latest, loaders)
  } else if (hasAny(normalized, ['student', 'school', 'weapon', 'birthday'])) {
    message = await localStudentFallback(latest, loaders)
  } else if (hasAny(normalized, ['top', 'leaderboard', 'stat', 'stats', 'current'])) {
    message = statsOverviewAnswer(await getStatsOverview(loaders))
  } else if (hasAny(normalized, ['site', 'website', 'discord', 'credit', 'author', 'settings', 'download'])) {
    message = await localSiteFallback(latest, loaders)
  } else if (hasAny(normalized, ['player', 'profile', 'user', 'ign', 'joined', 'submission', 'submissions'])) {
    message = await localPlayerProfileFallback(latest, loaders)
  }

  if (!message) return null
  rememberConversationTurn(memory, latest, message)
  return { message, model: `${options.model} local-fallback`, memory, expression: 'neutral', expressionIntensity: 0.3 }
}
