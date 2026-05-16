import { NextResponse } from 'next/server'
import { getBirthdayDay } from '@/lib/birthdays'
import { invalidatePublicData, PUBLIC_CACHE_TAGS } from '@/lib/cache'
import { prisma } from '@/lib/prisma'
import { normalizeStudentAccentColor, normalizeStudentId } from '@/lib/students'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const id = normalizeStudentId((body as Record<string, unknown>).id)
  const accentColor = normalizeStudentAccentColor((body as Record<string, unknown>).accentColor)
  if (!id || !accentColor) {
    return NextResponse.json({ error: 'Valid student id and accent color are required' }, { status: 400 })
  }

  const birthdayDay = getBirthdayDay()
  const result = await prisma.student.updateMany({
    where: {
      id,
      birthDay: birthdayDay.key,
      accentColor: null,
    },
    data: { accentColor },
  })

  if (result.count > 0) invalidatePublicData([PUBLIC_CACHE_TAGS.birthdays, PUBLIC_CACHE_TAGS.students])
  return NextResponse.json({ saved: result.count > 0 })
}
