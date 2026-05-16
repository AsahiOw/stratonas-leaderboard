import { NextResponse } from 'next/server'
import { getBirthdayDay, getNextBirthdayRefreshAt } from '@/lib/birthdays'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const birthdayDay = getBirthdayDay()
  const students = await prisma.student.findMany({
    where: { birthDay: birthdayDay.key },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      image: true,
      memorial: true,
      familyName: true,
      personalName: true,
      school: true,
      club: true,
      schoolYear: true,
      characterAge: true,
      birthday: true,
      birthDay: true,
      hobby: true,
      heightMetric: true,
      weaponType: true,
      tacticRole: true,
      position: true,
      weaponName: true,
      accentColor: true,
    },
  })

  return NextResponse.json({
    birthdayKey: birthdayDay.key,
    nextRefreshAt: getNextBirthdayRefreshAt().toISOString(),
    students,
  })
}
