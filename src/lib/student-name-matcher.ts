export type StudentRecord = { id: number; name: string }

type StudentVariant = {
  base: string
  variant: string
}

export type StudentMatchConfig = {
  variantPrefixes: Record<string, string[]>
  studentAliases: Record<string, string>
  baseAliases: Record<string, string>
  variantAliases: Record<string, string>
  ignoredDescriptorTokens: Set<string>
}

export type StudentLookup = {
  aliases: Map<string, StudentRecord>
  variantsByBase: Map<string, StudentRecord[]>
  baseStudents: Map<string, StudentRecord>
  searchableNames: Array<{ normalized: string; student: StudentRecord }>
  students: StudentRecord[]
  config: StudentMatchConfig
}

export type StudentMatchResult =
  | { status: 'matched'; student: StudentRecord; confidence: 1; normalizedInput: string }
  | { status: 'suggested'; student: StudentRecord; confidence: number; normalizedInput: string }
  | { status: 'unmatched'; student: null; confidence: 0; normalizedInput: string }

export const DEFAULT_STUDENT_MATCH_CONFIG: StudentMatchConfig = {
  variantPrefixes: {
    armed: ['A'],
    swimsuit: ['S'],
    maid: ['M'],
    'new year': ['NY'],
    hotspring: ['HS'],
    'hot spring': ['HS'],
    dress: ['D'],
    band: ['B'],
    bunny: ['B'],
    casual: ['C'],
    'cheer squad': ['C'],
    'pop idol': ['I'],
    pajamas: ['P'],
    magical: ['M'],
    school: ['U'],
    track: ['T'],
    camp: ['C'],
    idol: ['I'],
    pajama: ['P'],
    uniform: ['U'],
  },
  studentAliases: {
    'b hoshi': 'Hoshino (Armed)',
    'b hoshino': 'Hoshino (Armed)',
    'c sena': 'Sena (Casual)',
    'i sakurako': 'Sakurako (Pop Idol)',
    kuroko: 'Shiroko*Terror',
    'm reisa': 'Reisa (Magical)',
    miku: 'Hatsune Miku',
    'p noa': 'Noa (Pajamas)',
    'p yuuka': 'Yuuka (Pajamas)',
    't shiroko': 'Shiroko*Terror',
    'u akane': 'Akane (School)',
    'ah ru': 'Aru',
  },
  baseAliases: {
    alice: 'aris',
    arisu: 'aris',
    hoshi: 'hoshino',
    kokonut: 'kokona',
    shino: 'hoshino',
  },
  variantAliases: {
    battle: 'armed',
    chear: 'cheer squad',
    cheer: 'cheer squad',
  },
  ignoredDescriptorTokens: new Set([
    'best',
    'chibi',
    'emoji',
    'fav',
    'favorite',
    'icon',
    'l2d',
    'love',
    'mommy',
    'pfp',
    'profile',
    'smirk',
    'student',
  ]),
}

function mergeConfig(config?: Partial<StudentMatchConfig>): StudentMatchConfig {
  return {
    variantPrefixes: config?.variantPrefixes || DEFAULT_STUDENT_MATCH_CONFIG.variantPrefixes,
    studentAliases: config?.studentAliases || DEFAULT_STUDENT_MATCH_CONFIG.studentAliases,
    baseAliases: config?.baseAliases || DEFAULT_STUDENT_MATCH_CONFIG.baseAliases,
    variantAliases: config?.variantAliases || DEFAULT_STUDENT_MATCH_CONFIG.variantAliases,
    ignoredDescriptorTokens: config?.ignoredDescriptorTokens || DEFAULT_STUDENT_MATCH_CONFIG.ignoredDescriptorTokens,
  }
}

export function normalizeStudentLookup(value: string): string {
  return value
    .replace(/&/g, 'and')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function canonicalBase(base: string, config: StudentMatchConfig) {
  const normalized = normalizeStudentLookup(base)
  return config.baseAliases[normalized] || normalized
}

function canonicalVariant(variant: string, config: StudentMatchConfig) {
  const normalized = normalizeStudentLookup(variant)
  return config.variantAliases[normalized] || normalized
}

function studentVariant(name: string): StudentVariant | null {
  const parenthesized = name.match(/^(.+?)\s*\((.+)\)$/)
  if (parenthesized) {
    return {
      base: parenthesized[1].trim(),
      variant: parenthesized[2].trim(),
    }
  }

  const starred = name.match(/^(.+?)\s*\*\s*(.+)$/)
  if (starred) {
    return {
      base: starred[1].trim(),
      variant: starred[2].trim(),
    }
  }

  return null
}

function variantPrefixes(variant: string, config: StudentMatchConfig): string[] {
  const normalized = canonicalVariant(variant, config)
  const configured = config.variantPrefixes[normalized] || []
  const words = normalized.split(' ').filter(Boolean)
  const firstWordInitial = words[0]?.slice(0, 1).toUpperCase()
  const acronym = words.map((word) => word[0]).join('').toUpperCase()

  return Array.from(new Set([
    ...configured,
    firstWordInitial,
    acronym,
  ].filter((prefix): prefix is string => Boolean(prefix))))
}

function addAlias(aliases: Map<string, StudentRecord>, alias: string, student: StudentRecord) {
  const normalized = normalizeStudentLookup(alias)
  if (normalized) aliases.set(normalized, student)
}

function studentAliases(name: string, config: StudentMatchConfig): string[] {
  const aliases = new Set([name])
  const variantData = studentVariant(name)
  if (variantData) {
    const base = variantData.base
    const variant = variantData.variant
    variantPrefixes(variant, config).forEach((prefix) => {
      aliases.add(`${prefix} ${base}`)
      aliases.add(`${prefix}.${base}`)
      aliases.add(`${base} ${prefix}`)
    })
    aliases.add(`${base} ${variant}`)
    aliases.add(`${variant} ${base}`)

    const canonical = canonicalVariant(variant, config)
    if (canonical !== normalizeStudentLookup(variant)) {
      aliases.add(`${base} ${canonical}`)
      aliases.add(`${canonical} ${base}`)
    }
  }
  return Array.from(aliases)
}

function findUnique(students: StudentRecord[]) {
  const unique = Array.from(new Map(students.map((student) => [normalizeStudentLookup(student.name), student])).values())
  return unique.length === 1 ? unique[0] : null
}

function findPrefixedVariant(normalized: string, studentLookup: StudentLookup) {
  const match = normalized.match(/^([a-z]{1,3})\s+(.+)$/)
  if (!match) return null

  const prefix = match[1].toUpperCase()
  const base = canonicalBase(match[2], studentLookup.config)
  const variants = studentLookup.variantsByBase.get(base) || []
  if (variants.length === 0) return null

  const matchingVariants = variants.filter((student) => {
    const variantData = studentVariant(student.name)
    return variantData ? variantPrefixes(variantData.variant, studentLookup.config).includes(prefix) : false
  })
  if (matchingVariants.length === 1) return matchingVariants[0]

  if (matchingVariants.length === 0 && variants.length === 1) return variants[0]
  return null
}

function findPrefixedVariantWithExtraTokens(normalized: string, studentLookup: StudentLookup) {
  const [prefixToken, ...rest] = normalized.split(' ').filter(Boolean)
  if (!prefixToken || rest.length === 0 || prefixToken.length > 3) return null

  const prefix = prefixToken.toUpperCase()
  const restWords = new Set(rest)
  const matches = Array.from(studentLookup.variantsByBase.entries()).flatMap(([base, variants]) => {
    const baseWords = base.split(' ').filter(Boolean)
    if (baseWords.length === 0 || !baseWords.every((word) => restWords.has(word))) return []

    return variants.filter((student) => {
      const variantData = studentVariant(student.name)
      return variantData ? variantPrefixes(variantData.variant, studentLookup.config).includes(prefix) : false
    })
  })

  return findUnique(matches)
}

function findVariantByWords(normalized: string, studentLookup: StudentLookup) {
  const words = normalized.split(' ').filter(Boolean)
  if (words.length < 2) return null

  for (let split = 1; split < words.length; split += 1) {
    const left = words.slice(0, split).join(' ')
    const right = words.slice(split).join(' ')
    const candidates = [
      { base: canonicalBase(left, studentLookup.config), variant: canonicalVariant(right, studentLookup.config) },
      { base: canonicalBase(right, studentLookup.config), variant: canonicalVariant(left, studentLookup.config) },
    ]

    for (const candidate of candidates) {
      const variants = studentLookup.variantsByBase.get(candidate.base) || []
      const match = variants.find((student) => {
        const variantData = studentVariant(student.name)
        return variantData ? canonicalVariant(variantData.variant, studentLookup.config) === candidate.variant : false
      })
      if (match) return match
    }
  }

  return null
}

function stripIgnoredTokens(normalized: string, studentLookup: StudentLookup) {
  return normalized
    .split(' ')
    .filter((token) => !studentLookup.config.ignoredDescriptorTokens.has(token))
    .join(' ')
}

function splitCompactKnownWords(normalized: string, studentLookup: StudentLookup) {
  if (normalized.includes(' ')) return normalized

  const matches = studentLookup.searchableNames
    .map(({ normalized: studentName }) => ({
      name: studentName,
      index: normalized.indexOf(studentName),
    }))
    .filter((match) => match.name.length >= 3 && match.index >= 0)
    .sort((a, b) => a.index - b.index || b.name.length - a.name.length)

  const selected: Array<{ name: string; index: number }> = []
  matches.forEach((match) => {
    const start = match.index
    const end = start + match.name.length
    const overlaps = selected.some((selectedMatch) => {
      const selectedStart = selectedMatch.index
      const selectedEnd = selectedStart + selectedMatch.name.length
      return start < selectedEnd && end > selectedStart
    })
    if (!overlaps) selected.push(match)
  })

  let spaced = normalized
  selected
    .sort((a, b) => b.index - a.index)
    .forEach((match) => {
      spaced = `${spaced.slice(0, match.index)} ${match.name} ${spaced.slice(match.index + match.name.length)}`
    })

  return normalizeStudentLookup(spaced)
}

function findContainedStudent(normalized: string, studentLookup: StudentLookup) {
  const words = new Set(normalized.split(' ').filter(Boolean))
  const matches = studentLookup.searchableNames
    .filter(({ normalized: studentName }) => {
      const studentWords = studentName.split(' ').filter(Boolean)
      return studentWords.every((word) => words.has(word)) || normalized.includes(studentName)
    })
    .map(({ student }) => student)

  return findUnique(matches)
}

function findBaseStudentWithExtraTokens(normalized: string, studentLookup: StudentLookup) {
  const words = new Set(normalized.split(' ').filter(Boolean))
  const matches = Array.from(studentLookup.baseStudents.entries())
    .filter(([base]) => {
      const baseWords = base.split(' ').filter(Boolean)
      return baseWords.length > 0 && baseWords.every((word) => words.has(word))
    })
    .map(([, student]) => student)

  return findUnique(matches)
}

export function buildStudentLookupFromRecords(
  students: StudentRecord[],
  configOverride?: Partial<StudentMatchConfig>,
): StudentLookup {
  const config = mergeConfig(configOverride)
  const aliases = new Map<string, StudentRecord>()
  const variantsByBase = new Map<string, StudentRecord[]>()
  const baseStudents = new Map<string, StudentRecord>()

  students.forEach((student) => {
    studentAliases(student.name, config).forEach((alias) => addAlias(aliases, alias, student))

    const variantData = studentVariant(student.name)
    if (variantData) {
      const normalizedBase = canonicalBase(variantData.base, config)
      const variants = variantsByBase.get(normalizedBase) || []
      variants.push(student)
      variantsByBase.set(normalizedBase, variants)
      return
    }

    baseStudents.set(canonicalBase(student.name, config), student)
  })

  Object.entries(config.studentAliases).forEach(([alias, target]) => {
    const student = aliases.get(normalizeStudentLookup(target))
    if (student) addAlias(aliases, alias, student)
  })

  const searchableNames = students
    .flatMap((student) => {
      const variantData = studentVariant(student.name)
      return [
        { normalized: normalizeStudentLookup(student.name), student },
        variantData ? { normalized: canonicalBase(variantData.base, config), student } : null,
      ]
    })
    .filter((entry): entry is { normalized: string; student: StudentRecord } => Boolean(entry?.normalized))

  Object.entries(config.baseAliases).forEach(([alias, target]) => {
    const student = baseStudents.get(target)
    if (student) searchableNames.push({ normalized: alias, student })
  })

  return { aliases, variantsByBase, baseStudents, searchableNames, students, config }
}

export function resolveStudentFromLookup(raw: string, studentLookup: StudentLookup): StudentRecord | null {
  const normalized = normalizeStudentLookup(raw)
  if (!normalized) return null

  const manualAlias = studentLookup.config.studentAliases[normalized]
  if (manualAlias) return studentLookup.aliases.get(normalizeStudentLookup(manualAlias)) || null

  const exact = studentLookup.aliases.get(normalized)
  if (exact) return exact

  const prefixed = findPrefixedVariant(normalized, studentLookup)
  if (prefixed) return prefixed

  const variantByWords = findVariantByWords(normalized, studentLookup)
  if (variantByWords) return variantByWords

  const base = studentLookup.baseStudents.get(canonicalBase(normalized, studentLookup.config))
  if (base) return base

  const stripped = stripIgnoredTokens(splitCompactKnownWords(normalized, studentLookup), studentLookup)
  if (stripped && stripped !== normalized) {
    const strippedMatch = resolveStudentFromLookup(stripped, studentLookup)
    if (strippedMatch) return strippedMatch
  }

  const prefixedWithExtraTokens = findPrefixedVariantWithExtraTokens(stripped || normalized, studentLookup)
  if (prefixedWithExtraTokens) return prefixedWithExtraTokens

  const baseWithExtraTokens = findBaseStudentWithExtraTokens(stripped || normalized, studentLookup)
  if (baseWithExtraTokens) return baseWithExtraTokens

  return findContainedStudent(normalized, studentLookup)
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
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      )
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
  const distance = levenshteinDistance(a, b)
  const editScore = 1 - distance / Math.max(a.length, b.length, 1)
  const tokenScore = tokenOverlapScore(a, b)
  return Math.max(editScore, tokenScore)
}

function fuzzyCandidates(studentLookup: StudentLookup) {
  const seen = new Set<string>()
  return [
    ...studentLookup.aliases.entries(),
    ...studentLookup.searchableNames.map(({ normalized, student }) => [normalized, student] as const),
  ].filter(([normalized, student]) => {
    const key = `${normalized}:${student.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return normalized.length >= 2
  })
}

export function suggestStudentFromLookup(raw: string, studentLookup: StudentLookup): StudentMatchResult {
  const normalized = normalizeStudentLookup(raw)
  if (!normalized) return { status: 'unmatched', student: null, confidence: 0, normalizedInput: normalized }

  const deterministic = resolveStudentFromLookup(raw, studentLookup)
  if (deterministic) return { status: 'matched', student: deterministic, confidence: 1, normalizedInput: normalized }

  const stripped = stripIgnoredTokens(splitCompactKnownWords(normalized, studentLookup), studentLookup) || normalized
  const candidates = fuzzyCandidates(studentLookup)
    .map(([candidate, student]) => ({
      student,
      confidence: Math.max(similarityScore(normalized, candidate), similarityScore(stripped, candidate)),
    }))
    .sort((a, b) => b.confidence - a.confidence)

  const best = candidates[0]
  if (!best || best.confidence < 0.75) {
    return { status: 'unmatched', student: null, confidence: 0, normalizedInput: normalized }
  }

  const sameScoreMatches = candidates.filter((candidate) => Math.abs(candidate.confidence - best.confidence) < 0.02)
  const uniqueBest = findUnique(sameScoreMatches.map((candidate) => candidate.student))
  if (!uniqueBest) return { status: 'unmatched', student: null, confidence: 0, normalizedInput: normalized }

  if (best.confidence >= 0.92) {
    return { status: 'matched', student: uniqueBest, confidence: 1, normalizedInput: normalized }
  }

  return {
    status: 'suggested',
    student: uniqueBest,
    confidence: Number(best.confidence.toFixed(4)),
    normalizedInput: normalized,
  }
}
