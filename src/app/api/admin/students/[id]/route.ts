import { NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { invalidatePublicData } from '@/lib/cache'
import { deleteCustomStudentMedia, deleteCustomStudentMediaFolder, saveCustomStudentMedia } from '@/lib/custom-student-media'
import {
  normalizePortraitOffsetNumber,
  normalizePortraitScale,
  normalizeStudentCardFields,
  normalizeStudentId,
  studentImageUrl,
} from '@/lib/students'

export const dynamic = 'force-dynamic'

async function readStudentBody(req: Request) {
  const contentType = req.headers.get('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    return { body: await req.json(), imageFile: null, portraitFile: null }
  }

  const form = await req.formData()
  const body = Object.fromEntries(form.entries())
  const imageFile = form.get('imageFile')
  const portraitFile = form.get('portraitFile')

  return {
    body,
    imageFile: imageFile instanceof File && imageFile.size > 0 ? imageFile : null,
    portraitFile: portraitFile instanceof File && portraitFile.size > 0 ? portraitFile : null,
  }
}

function studentErrorResponse(error: unknown, fallback = 'Could not save student.') {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    return NextResponse.json({ error: 'Student not found.' }, { status: 404 })
  }
  if (error instanceof Error && error.message) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ error: fallback }, { status: 500 })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const { id: rawId } = await params
  const id = normalizeStudentId(rawId)
  if (!id) return NextResponse.json({ error: 'Invalid student id' }, { status: 400 })

  const { body, imageFile, portraitFile } = await readStudentBody(req)
  const name = typeof body.name === 'string' ? body.name.trim() : ''
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

  const savedMedia: string[] = []
  let studentUpdated = false

  try {
    const currentStudent = await prisma.student.findUnique({ where: { id } })
    if (!currentStudent) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })

    const image = imageFile
      ? await saveCustomStudentMedia(imageFile, id, 'image').then((value) => {
        savedMedia.push(value)
        return value
      })
      : typeof body.image === 'string' && body.image.trim() ? body.image.trim() : studentImageUrl(id)
    const portrait = portraitFile
      ? await saveCustomStudentMedia(portraitFile, id, 'portrait').then((value) => {
        savedMedia.push(value)
        return value
      })
      : typeof body.portrait === 'string' && body.portrait.trim() ? body.portrait.trim() : null

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
    studentUpdated = true
    if (student.image !== currentStudent.image) {
      await deleteCustomStudentMedia(id, currentStudent.image)
    }
    if (student.portrait !== currentStudent.portrait) {
      await deleteCustomStudentMedia(id, currentStudent.portrait)
    }
    await prisma.player.updateMany({
      where: { favouriteStudentId: id },
      data: { favouriteStudent: student.name },
    })

    invalidatePublicData()
    return NextResponse.json(student)
  } catch (error) {
    if (!studentUpdated) {
      await Promise.all(savedMedia.map((value) => deleteCustomStudentMedia(id, value)))
    }
    return studentErrorResponse(error)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const { id: rawId } = await params
  const id = normalizeStudentId(rawId)
  if (!id) return NextResponse.json({ error: 'Invalid student id' }, { status: 400 })

  try {
    await prisma.player.updateMany({
      where: { favouriteStudentId: id },
      data: { favouriteStudentId: null },
    })
    await prisma.student.delete({ where: { id } })
    await deleteCustomStudentMediaFolder(id)
    invalidatePublicData()
    return NextResponse.json({ ok: true })
  } catch (error) {
    return studentErrorResponse(error, 'Could not delete student.')
  }
}
