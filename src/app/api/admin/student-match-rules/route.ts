import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { normalizeStudentLookup } from '@/lib/student-name-matcher'
import { normalizeStudentId } from '@/lib/students'

export const dynamic = 'force-dynamic'

const RULE_TYPES = new Set(['variant_prefix', 'base_alias', 'variant_alias', 'ignored_token', 'student_alias'])

function stringField(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard

  const [rules, aliases] = await Promise.all([
    prisma.studentMatchRule.findMany({ orderBy: [{ type: 'asc' }, { pattern: 'asc' }] }),
    prisma.studentAlias.findMany({
      include: { student: true },
      orderBy: { alias: 'asc' },
    }),
  ])

  return NextResponse.json({ rules, aliases })
}

export async function POST(req: Request) {
  const guard = await requireAdmin()
  if (guard) return guard

  const body = await req.json()
  const kind = stringField(body.kind)

  if (kind === 'alias') {
    const alias = stringField(body.alias)
    const studentId = normalizeStudentId(body.studentId)
    if (!alias || !studentId) return NextResponse.json({ error: 'Alias and student are required.' }, { status: 400 })

    const student = await prisma.student.findUnique({ where: { id: studentId } })
    if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })

    const record = await prisma.studentAlias.upsert({
      where: { normalizedAlias: normalizeStudentLookup(alias) },
      update: { alias, studentId },
      create: { alias, normalizedAlias: normalizeStudentLookup(alias), studentId },
      include: { student: true },
    })
    return NextResponse.json(record, { status: 201 })
  }

  const type = stringField(body.type)
  const pattern = stringField(body.pattern)
  const value = stringField(body.value)
  if (!RULE_TYPES.has(type) || !pattern) {
    return NextResponse.json({ error: 'Valid rule type and pattern are required.' }, { status: 400 })
  }
  if (!['ignored_token'].includes(type) && !value) {
    return NextResponse.json({ error: 'Rule value is required for this type.' }, { status: 400 })
  }

  const record = await prisma.studentMatchRule.upsert({
    where: {
      type_normalizedPattern_normalizedValue: {
        type,
        normalizedPattern: normalizeStudentLookup(pattern),
        normalizedValue: normalizeStudentLookup(value),
      },
    },
    update: { pattern, value, enabled: body.enabled ?? true },
    create: {
      type,
      pattern,
      normalizedPattern: normalizeStudentLookup(pattern),
      value,
      normalizedValue: normalizeStudentLookup(value),
      enabled: body.enabled ?? true,
    },
  })
  return NextResponse.json(record, { status: 201 })
}
