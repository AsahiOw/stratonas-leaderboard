import { LeaderboardApp } from '@/components/LeaderboardApp'
import {
  getCurrentBirthdayDay,
  getPublicBirthdayStudents,
  getPublicFutureRecruitment,
  getPublicRaidEntries,
  getPublicRaids,
  getPublicUpcomingBirthdayStudents,
} from '@/lib/public-data'
import { getNextBirthdayRefreshAt } from '@/lib/birthdays'
import { dateKeyFromDate } from '@/lib/recruitments'

export const dynamic = 'force-dynamic'

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

export default async function Home() {
  const birthdayDay = getCurrentBirthdayDay()
  const nextBirthdayRefreshAt = getNextBirthdayRefreshAt()
  const recruitmentTodayKey = dateKeyFromDate()
  const [raids, futureRecruitment, birthdayStudents, upcomingBirthdayStudents] = await Promise.all([
    getPublicRaids(),
    getPublicFutureRecruitment(recruitmentTodayKey),
    getPublicBirthdayStudents(birthdayDay.key),
    getPublicUpcomingBirthdayStudents(birthdayDay.key, undefined, 60),
  ])
  const activeRaids = raids.filter((raid) => raid.isActive)
  const activeRaidEntries = await Promise.all(
    activeRaids.map(async (raid) => [raid.id, await getPublicRaidEntries(raid.id)] as const)
  )

  return (
    <LeaderboardApp
      initialRaids={raids.map((r) => ({
        ...r,
        startDate: toIsoDate(r.startDate),
        endDate: toIsoDate(r.endDate),
      }))}
      initialRaidEntries={Object.fromEntries(activeRaidEntries)}
      futureRecruitment={futureRecruitment}
      initialBirthdayData={{
        birthdayKey: birthdayDay.key,
        nextRefreshAt: nextBirthdayRefreshAt.toISOString(),
        students: birthdayStudents,
      }}
      initialUpcomingBirthdayData={{
        birthdayKey: birthdayDay.key,
        nextRefreshAt: nextBirthdayRefreshAt.toISOString(),
        maxDays: 60,
        students: upcomingBirthdayStudents,
      }}
    />
  )
}
