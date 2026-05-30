import { prisma } from '@/lib/prisma'
import {
  buildStudentLookupFromRecords,
  normalizeStudentLookup,
  type StudentLookup,
  type StudentMatchConfig,
  type StudentRecord,
} from '@/lib/student-name-matcher'

type RuleRow = {
  type: string
  pattern: string
  value: string
}

function addRecordValue(map: Record<string, string[]>, key: string, value: string) {
  if (!key || !value) return
  map[key] = Array.from(new Set([...(map[key] || []), value]))
}

function buildConfigFromRows(rules: RuleRow[], aliases: Array<{ alias: string; student: StudentRecord }>): StudentMatchConfig {
  const variantPrefixes: Record<string, string[]> = {}
  const studentAliases: Record<string, string> = {}
  const baseAliases: Record<string, string> = {}
  const variantAliases: Record<string, string> = {}
  const ignoredDescriptorTokens = new Set<string>()

  rules.forEach((rule) => {
    const pattern = normalizeStudentLookup(rule.pattern)
    const value = normalizeStudentLookup(rule.value)
    if (!pattern) return

    if (rule.type === 'variant_prefix') addRecordValue(variantPrefixes, pattern, rule.value.trim())
    else if (rule.type === 'base_alias' && value) baseAliases[pattern] = value
    else if (rule.type === 'variant_alias' && value) variantAliases[pattern] = value
    else if (rule.type === 'ignored_token') ignoredDescriptorTokens.add(pattern)
    else if (rule.type === 'student_alias' && rule.value.trim()) studentAliases[pattern] = rule.value.trim()
  })

  aliases.forEach((alias) => {
    const normalized = normalizeStudentLookup(alias.alias)
    if (normalized) studentAliases[normalized] = alias.student.name
  })

  return { variantPrefixes, studentAliases, baseAliases, variantAliases, ignoredDescriptorTokens }
}

export async function buildStudentLookupFromDatabase(): Promise<StudentLookup> {
  const [students, rules, aliases] = await Promise.all([
    prisma.student.findMany({ select: { id: true, name: true } }),
    prisma.studentMatchRule.findMany({
      where: { enabled: true },
      select: { type: true, pattern: true, value: true },
    }),
    prisma.studentAlias.findMany({
      select: {
        alias: true,
        student: { select: { id: true, name: true } },
      },
    }),
  ])

  return buildStudentLookupFromRecords(students, buildConfigFromRows(rules, aliases))
}
