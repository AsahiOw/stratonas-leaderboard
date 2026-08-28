import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { jsonWithNoStore } from '@/lib/cache'
import { getActiveRaidIds } from '@/lib/raid-activity'
import { presentAdminActivity } from '@/lib/admin-activity-outcome'

export const dynamic = 'force-dynamic'
const INITIAL_ACTIVITY_LIMIT = 10
const MORE_ACTIVITY_LIMIT = 50

async function getActivityPage(limit: number, cursor: string | null) {
  const records = await prisma.adminActivity.findMany({
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })
  const hasMore = records.length > limit
  const page = records.slice(0, limit)
  return {
    recentActivity: page.map(presentAdminActivity),
    activityPage: { hasMore, nextCursor: hasMore ? page.at(-1)?.id || null : null },
  }
}

export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard) return guard

  const activityOnly = request.nextUrl.searchParams.get('activityOnly') === '1'
  const requestedLimit = Number(request.nextUrl.searchParams.get('activityLimit'))
  const limit = requestedLimit === MORE_ACTIVITY_LIMIT ? MORE_ACTIVITY_LIMIT : INITIAL_ACTIVITY_LIMIT
  const cursor = request.nextUrl.searchParams.get('activityCursor')

  try {
    if (activityOnly) return jsonWithNoStore(await getActivityPage(limit, cursor))

    const [players, clubs, raids, entries, activityTotal, activity] = await Promise.all([
      prisma.player.count(),
      prisma.club.count(),
      prisma.raid.findMany({ select: { id: true, serverId: true, startDate: true } }),
      prisma.raidEntry.count(),
      prisma.adminActivity.count(),
      getActivityPage(limit, cursor),
    ])

    return jsonWithNoStore({
      counts: { players, clubs, activeRaids: getActiveRaidIds(raids).size, entries },
      ...activity,
      activityTotal,
    })
  } catch {
    return NextResponse.json({ error: 'Could not load dashboard activity.' }, { status: cursor ? 400 : 500 })
  }
}
