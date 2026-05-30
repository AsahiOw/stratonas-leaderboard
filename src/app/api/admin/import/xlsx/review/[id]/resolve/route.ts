import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { invalidatePublicData } from '@/lib/cache'
import { normalizeStudentLookup } from '@/lib/student-name-matcher'
import { normalizeStudentId } from '@/lib/students'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard

  const { id } = await params
  const body = await req.json()
  const ignore = Boolean(body.ignore)
  const rememberAlias = Boolean(body.rememberAlias)
  const studentId = normalizeStudentId(body.studentId)

  const item = await prisma.xlsxImportReviewItem.findUnique({
    where: { id },
    include: { player: true },
  })
  if (!item) return NextResponse.json({ error: 'Review item not found.' }, { status: 404 })
  if (item.status !== 'pending') return NextResponse.json({ error: 'Review item is already resolved.' }, { status: 400 })

  if (ignore) {
    const ignored = await prisma.xlsxImportReviewItem.update({
      where: { id },
      data: { status: 'ignored', resolvedAt: new Date() },
    })
    return NextResponse.json(ignored)
  }

  if (!studentId) return NextResponse.json({ error: 'Student is required.' }, { status: 400 })
  const student = await prisma.student.findUnique({ where: { id: studentId } })
  if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })

  const updated = await prisma.$transaction(async (tx) => {
    await tx.player.update({
      where: { id: item.playerId },
      data: {
        favouriteStudent: student.name,
        favouriteStudentId: student.id,
      },
    })

    if (rememberAlias && item.rawFavoriteStudent?.trim()) {
      const normalizedAlias = normalizeStudentLookup(item.rawFavoriteStudent)
      if (normalizedAlias) {
        await tx.studentAlias.upsert({
          where: { normalizedAlias },
          update: { alias: item.rawFavoriteStudent.trim(), studentId: student.id },
          create: {
            alias: item.rawFavoriteStudent.trim(),
            normalizedAlias,
            studentId: student.id,
          },
        })
      }
    }

    return tx.xlsxImportReviewItem.update({
      where: { id },
      data: {
        status: 'resolved',
        resolvedStudentId: student.id,
        resolvedAt: new Date(),
      },
      include: {
        player: true,
        suggestedStudent: true,
        resolvedStudent: true,
      },
    })
  })

  invalidatePublicData()
  return NextResponse.json(updated)
}
