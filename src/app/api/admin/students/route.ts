import { NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { invalidatePublicData } from '@/lib/cache'
import { deleteCustomStudentMedia, saveCustomStudentMedia } from '@/lib/custom-student-media'
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

function studentErrorResponse(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return NextResponse.json({ error: 'A student with this ID already exists.' }, { status: 409 })
  }
  if (error instanceof Error && error.message) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ error: 'Could not save student.' }, { status: 500 })
}

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard
  const students = await prisma.student.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(students)
}

export async function POST(req: Request) {
  const guard = await requireAdmin()
  if (guard) return guard
  const { body, imageFile, portraitFile } = await readStudentBody(req)
  const id = normalizeStudentId(body.id)
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

  if (!id || !name) {
    return NextResponse.json({ error: 'Student id, name, and image are required' }, { status: 400 })
  }

  const savedMedia: string[] = []

  try {
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

    if (!image) {
      await Promise.all(savedMedia.map((value) => deleteCustomStudentMedia(id, value)))
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
    invalidatePublicData()
    return NextResponse.json(student, { status: 201 })
  } catch (error) {
    await Promise.all(savedMedia.map((value) => deleteCustomStudentMedia(id, value)))
    return studentErrorResponse(error)
  }
}
