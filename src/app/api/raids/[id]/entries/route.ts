import { NextResponse } from 'next/server'
import { getRankedRaidEntries } from '@/lib/raid-entries'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return NextResponse.json(await getRankedRaidEntries(id))
}
