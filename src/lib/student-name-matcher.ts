export type StudentRecord = { id: number; name: string }

type StudentVariant = {
  base: string
  variant: string
}

export type StudentLookup = {
  aliases: Map<string, StudentRecord>
  variantsByBase: Map<string, StudentRecord[]>
  baseStudents: Map<string, StudentRecord>
  searchableNames: Array<{ normalized: string; student: StudentRecord }>
  students: StudentRecord[]
}

const VARIANT_PREFIXES: Record<string, string[]> = {
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
}

const MANUAL_STUDENT_ALIASES: Record<string, string> = {
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
  'Ah Ru': 'Aru'
}

const BASE_ALIASES: Record<string, string> = {
  alice: 'aris',
  arisu: 'aris',
  hoshi: 'hoshino',
  kokonut: 'kokona',
  shino: 'hoshino',
}

const VARIANT_ALIASES: Record<string, string> = {
  battle: 'armed',
  chear: 'cheer squad',
  cheer: 'cheer squad',
}

const IGNORED_DESCRIPTOR_TOKENS = new Set([
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
])

export function normalizeStudentLookup(value: string): string {
  return value
    .replace(/&/g, 'and')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function canonicalBase(base: string) {
  const normalized = normalizeStudentLookup(base)
  return BASE_ALIASES[normalized] || normalized
}

function canonicalVariant(variant: string) {
  const normalized = normalizeStudentLookup(variant)
  return VARIANT_ALIASES[normalized] || normalized
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

function variantPrefixes(variant: string): string[] {
  const normalized = canonicalVariant(variant)
  const configured = VARIANT_PREFIXES[normalized] || []
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

function studentAliases(name: string): string[] {
  const aliases = new Set([name])
  const variantData = studentVariant(name)
  if (variantData) {
    const base = variantData.base
    const variant = variantData.variant
    variantPrefixes(variant).forEach((prefix) => {
      aliases.add(`${prefix} ${base}`)
      aliases.add(`${prefix}.${base}`)
    })
    aliases.add(`${base} ${variant}`)
    aliases.add(`${variant} ${base}`)

    const canonical = canonicalVariant(variant)
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
  const base = canonicalBase(match[2])
  const variants = studentLookup.variantsByBase.get(base) || []
  if (variants.length === 0) return null

  const matchingVariants = variants.filter((student) => {
    const variantData = studentVariant(student.name)
    return variantData ? variantPrefixes(variantData.variant).includes(prefix) : false
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
      return variantData ? variantPrefixes(variantData.variant).includes(prefix) : false
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
      { base: canonicalBase(left), variant: canonicalVariant(right) },
      { base: canonicalBase(right), variant: canonicalVariant(left) },
    ]

    for (const candidate of candidates) {
      const variants = studentLookup.variantsByBase.get(candidate.base) || []
      const match = variants.find((student) => {
        const variantData = studentVariant(student.name)
        return variantData ? canonicalVariant(variantData.variant) === candidate.variant : false
      })
      if (match) return match
    }
  }

  return null
}

function stripIgnoredTokens(normalized: string) {
  return normalized
    .split(' ')
    .filter((token) => !IGNORED_DESCRIPTOR_TOKENS.has(token))
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

export function buildStudentLookupFromRecords(students: StudentRecord[]): StudentLookup {
  const aliases = new Map<string, StudentRecord>()
  const variantsByBase = new Map<string, StudentRecord[]>()
  const baseStudents = new Map<string, StudentRecord>()

  students.forEach((student) => {
    studentAliases(student.name).forEach((alias) => addAlias(aliases, alias, student))

    const variantData = studentVariant(student.name)
    if (variantData) {
      const normalizedBase = canonicalBase(variantData.base)
      const variants = variantsByBase.get(normalizedBase) || []
      variants.push(student)
      variantsByBase.set(normalizedBase, variants)
      return
    }

    baseStudents.set(canonicalBase(student.name), student)
  })

  Object.entries(MANUAL_STUDENT_ALIASES).forEach(([alias, target]) => {
    const student = aliases.get(normalizeStudentLookup(target))
    if (student) addAlias(aliases, alias, student)
  })

  const searchableNames = students
    .flatMap((student) => {
      const variantData = studentVariant(student.name)
      return [
        { normalized: normalizeStudentLookup(student.name), student },
        variantData ? { normalized: canonicalBase(variantData.base), student } : null,
      ]
    })
    .filter((entry): entry is { normalized: string; student: StudentRecord } => Boolean(entry?.normalized))

  Object.entries(BASE_ALIASES).forEach(([alias, target]) => {
    const student = baseStudents.get(target)
    if (student) searchableNames.push({ normalized: alias, student })
  })

  return { aliases, variantsByBase, baseStudents, searchableNames, students }
}

export function resolveStudentFromLookup(raw: string, studentLookup: StudentLookup): StudentRecord | null {
  const normalized = normalizeStudentLookup(raw)
  if (!normalized) return null

  const manualAlias = MANUAL_STUDENT_ALIASES[normalized]
  if (manualAlias) return studentLookup.aliases.get(normalizeStudentLookup(manualAlias)) || null

  const exact = studentLookup.aliases.get(normalized)
  if (exact) return exact

  const prefixed = findPrefixedVariant(normalized, studentLookup)
  if (prefixed) return prefixed

  const variantByWords = findVariantByWords(normalized, studentLookup)
  if (variantByWords) return variantByWords

  const base = studentLookup.baseStudents.get(canonicalBase(normalized))
  if (base) return base

  const stripped = stripIgnoredTokens(splitCompactKnownWords(normalized, studentLookup))
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
