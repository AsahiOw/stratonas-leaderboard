import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import {
  normalizePortraitOffsetNumber,
  normalizePortraitScale,
  normalizeStudentCardFields,
  normalizeStudentId,
  studentImageUrl,
} from '@/lib/students'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard
  const students = await prisma.student.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(students)
}

export async function POST(req: Request) {
  const guard = await requireAdmin()
  if (guard) return guard
  const body = await req.json()
  const id = normalizeStudentId(body.id)
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const image = typeof body.image === 'string' && body.image.trim() ? body.image.trim() : id ? studentImageUrl(id) : ''
  const portrait = typeof body.portrait === 'string' && body.portrait.trim() ? body.portrait.trim() : null
  const memorial = typeof body.memorial === 'string' && body.memorial.trim() ? body.memorial.trim() : null
  const memorialOffsetX = normalizePortraitOffsetNumber(body.memorialOffsetX, -7.6)
  const memorialOffsetY = normalizePortraitOffsetNumber(body.memorialOffsetY, 0)
  const memorialScale = normalizePortraitOffsetNumber(body.memorialScale, 0.5) > 0
    ? normalizePortraitOffsetNumber(body.memorialScale, 0.5)
    : 0.5
  const portraitOffsetX = normalizePortraitOffsetNumber(body.portraitOffsetX, 0)
  const portraitOffsetY = normalizePortraitOffsetNumber(body.portraitOffsetY, 0)
  const portraitScale = normalizePortraitScale(body.portraitScale)
  const cardFields = normalizeStudentCardFields(body)

  if (!id || !name || !image) {
    return NextResponse.json({ error: 'Student id, name, and image are required' }, { status: 400 })
  }

  const student = await prisma.student.create({
    data: {
      id,
      name,
      image,
      portrait,
      memorial,
      ...cardFields,
      memorialOffsetX,
      memorialOffsetY,
      memorialScale,
      portraitOffsetX,
      portraitOffsetY,
      portraitScale,
    },
  })
  return NextResponse.json(student, { status: 201 })
}
