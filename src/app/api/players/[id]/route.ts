import { NextResponse } from 'next/server'
import { jsonWithPublicCache } from '@/lib/cache'
import { getPublicPlayerProfile } from '@/lib/public-data'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const ign = searchParams.get('ign')
  const player = await getPublicPlayerProfile(id, ign)

  if (!player) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return jsonWithPublicCache(player)
}
