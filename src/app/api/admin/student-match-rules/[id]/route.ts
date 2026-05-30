import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { normalizeStudentLookup } from '@/lib/student-name-matcher'
import { normalizeStudentId } from '@/lib/students'

const RULE_TYPES = new Set(['variant_prefix', 'base_alias', 'variant_alias', 'ignored_token', 'student_alias'])

function stringField(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseScopedId(value: string) {
  const [kind, ...rest] = value.split(':')
  return { kind, id: rest.join(':') }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard

  const { id: rawId } = await params
  const { kind, id } = parseScopedId(decodeURIComponent(rawId))
  const body = await req.json()

  if (kind === 'alias') {
    const alias = stringField(body.alias)
    const studentId = normalizeStudentId(body.studentId)
    if (!alias || !studentId) return NextResponse.json({ error: 'Alias and student are required.' }, { status: 400 })

    const student = await prisma.student.findUnique({ where: { id: studentId } })
    if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })

    const record = await prisma.studentAlias.update({
      where: { id },
      data: { alias, normalizedAlias: normalizeStudentLookup(alias), studentId },
      include: { student: true },
    })
    return NextResponse.json(record)
  }

  if (kind !== 'rule') return NextResponse.json({ error: 'Invalid rule id.' }, { status: 400 })

  const type = stringField(body.type)
  const pattern = stringField(body.pattern)
  const value = stringField(body.value)
  if (!RULE_TYPES.has(type) || !pattern) {
    return NextResponse.json({ error: 'Valid rule type and pattern are required.' }, { status: 400 })
  }

  const record = await prisma.studentMatchRule.update({
    where: { id },
    data: {
      type,
      pattern,
      normalizedPattern: normalizeStudentLookup(pattern),
      value,
      normalizedValue: normalizeStudentLookup(value),
      enabled: body.enabled ?? true,
    },
  })
  return NextResponse.json(record)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard

  const { id: rawId } = await params
  const { kind, id } = parseScopedId(decodeURIComponent(rawId))

  if (kind === 'alias') {
    await prisma.studentAlias.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  }

  if (kind === 'rule') {
    await prisma.studentMatchRule.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid rule id.' }, { status: 400 })
}
