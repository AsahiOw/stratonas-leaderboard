import { getPublicChibiStudents } from '@/lib/chibi/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export async function GET() {
  try {
    return NextResponse.json({ students: await getPublicChibiStudents() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'The student catalog is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
