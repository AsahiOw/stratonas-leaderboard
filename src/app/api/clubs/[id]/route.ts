import { NextResponse } from 'next/server'
import { jsonWithPublicCache } from '@/lib/cache'
import { getPublicClubProfile } from '@/lib/public-data'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const club = await getPublicClubProfile(id)

  if (!club) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return jsonWithPublicCache(club)
}
