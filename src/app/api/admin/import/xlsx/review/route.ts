import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard

  const items = await prisma.xlsxImportReviewItem.findMany({
    where: { status: 'pending' },
    include: {
      player: { include: { favouriteStudentData: true, clubData: true } },
      raid: {
        include: {
          raidBoss: true,
          type: true,
          server: true,
          terrain: true,
        },
      },
      suggestedStudent: true,
      resolvedStudent: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(items)
}
