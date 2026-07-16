import { LeaderboardApp } from '@/components/LeaderboardApp'
import {
  getCurrentBirthdayDay,
  getPublicBirthdayStudents,
  getPublicRecruitmentCalendar,
  getPublicFutureRecruitment,
  getPublicRaidEntries,
  getPublicRaids,
  getPublicUpcomingBirthdayStudents,
  isStudentVariant,
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
  const [raids, futureRecruitment, recruitmentCalendar, birthdayStudents, upcomingBirthdayStudents, calendarBirthdayStudents] = await Promise.all([
    getPublicRaids(),
    getPublicFutureRecruitment(recruitmentTodayKey),
    getPublicRecruitmentCalendar(),
    getPublicBirthdayStudents(birthdayDay.key),
    getPublicUpcomingBirthdayStudents(birthdayDay.key, undefined, 60),
    getPublicUpcomingBirthdayStudents(birthdayDay.key, undefined, 366),
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
      recruitmentCalendar={recruitmentCalendar}
      birthdayCalendar={Array.from(new Map([...birthdayStudents, ...calendarBirthdayStudents]
        .filter((student) => !isStudentVariant(student.name))
        .map((student) => [student.id, student])).values())}
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
