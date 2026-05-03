import { NextResponse } from 'next/server'
import { getRankedRaidEntries } from '@/lib/raid-entries'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return NextResponse.json(await getRankedRaidEntries(params.id))
}
