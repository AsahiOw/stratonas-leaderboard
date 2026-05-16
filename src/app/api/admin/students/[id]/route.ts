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

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const id = normalizeStudentId(params.id)
  if (!id) return NextResponse.json({ error: 'Invalid student id' }, { status: 400 })

  const body = await req.json()
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const image = typeof body.image === 'string' && body.image.trim() ? body.image.trim() : studentImageUrl(id)
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
  if (!name) return NextResponse.json({ error: 'Student name is required' }, { status: 400 })

  const student = await prisma.student.update({
    where: { id },
    data: {
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
  await prisma.player.updateMany({
    where: { favouriteStudentId: id },
    data: { favouriteStudent: student.name },
  })

  return NextResponse.json(student)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const id = normalizeStudentId(params.id)
  if (!id) return NextResponse.json({ error: 'Invalid student id' }, { status: 400 })

  await prisma.player.updateMany({
    where: { favouriteStudentId: id },
    data: { favouriteStudentId: null },
  })
  await prisma.student.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
