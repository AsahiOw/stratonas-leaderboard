import { NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { invalidatePublicData, PUBLIC_CACHE_TAGS } from '@/lib/cache'
import { isFutureDateKey } from '@/lib/recruitments'

export const dynamic = 'force-dynamic'

const upcomingInclude = {
  items: {
    orderBy: { position: 'asc' as const },
    include: {
      recruitment: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              image: true,
              characterVoice: true,
            },
          },
        },
      },
    },
  },
} as const

function normalizeDateKey(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeRecruitmentIds(value: unknown) {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter((id): id is string => typeof id === 'string' && id.trim().length > 0).map((id) => id.trim())))
}

async function validateRecruitmentIds(recruitmentIds: string[]) {
  if (recruitmentIds.length === 0) throw new Error('Choose at least one recruitment.')

  const rows = await prisma.recruitment.findMany({
    where: { id: { in: recruitmentIds } },
    select: { id: true },
  })
  if (rows.length !== recruitmentIds.length) throw new Error('One or more recruitments were not found.')
}

function scheduleErrorResponse(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return NextResponse.json({ error: 'Upcoming recruitment date already exists.' }, { status: 409 })
  }
  const message = error instanceof Error ? error.message : 'Could not save upcoming recruitment.'
  return NextResponse.json({ error: message }, { status: 400 })
}

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard

  const schedules = await prisma.upcomingRecruitment.findMany({
    include: upcomingInclude,
    orderBy: { dateKey: 'asc' },
  })
  return NextResponse.json(schedules)
}

export async function POST(req: Request) {
  const guard = await requireAdmin()
  if (guard) return guard

  try {
    const body = await req.json()
    const dateKey = normalizeDateKey(body.dateKey)
    if (!isFutureDateKey(dateKey)) {
      return NextResponse.json({ error: 'Upcoming recruitment date must be later than today.' }, { status: 400 })
    }

    const recruitmentIds = normalizeRecruitmentIds(body.recruitmentIds)
    await validateRecruitmentIds(recruitmentIds)

    const schedule = await prisma.upcomingRecruitment.create({
      data: {
        dateKey,
        items: {
          create: recruitmentIds.map((recruitmentId, position) => ({
            recruitment: { connect: { id: recruitmentId } },
            position,
          })),
        },
      },
      include: upcomingInclude,
    })
    invalidatePublicData([PUBLIC_CACHE_TAGS.recruitments])
    return NextResponse.json(schedule, { status: 201 })
  } catch (error) {
    return scheduleErrorResponse(error)
  }
}
