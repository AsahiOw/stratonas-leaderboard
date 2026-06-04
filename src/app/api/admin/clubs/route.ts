import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { invalidatePublicData } from '@/lib/cache'
import { saveClubLogo } from '@/lib/club-logo-upload'

export const runtime = 'nodejs'

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard

  const clubs = await prisma.club.findMany({
    include: { _count: { select: { players: true } } },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(clubs)
}

export async function POST(req: Request) {
  const guard = await requireAdmin()
  if (guard) return guard

  const form = await req.formData()
  const logoFile = form.get('logoFile')
  const existingLogo = typeof form.get('logo') === 'string' && String(form.get('logo')).trim() ? String(form.get('logo')).trim() : null
  const name = typeof form.get('name') === 'string' ? String(form.get('name')).trim() : ''
  const uid = typeof form.get('uid') === 'string' && String(form.get('uid')).trim() ? String(form.get('uid')).trim() : null
  const color = typeof form.get('color') === 'string' && String(form.get('color')).trim() ? String(form.get('color')).trim() : '#4f8ef7'
  if (!name) return NextResponse.json({ error: 'Club name is required.' }, { status: 400 })

  const existing = await prisma.club.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  })
  if (existing) return NextResponse.json({ error: 'Club already exists.' }, { status: 409 })

  const logo = logoFile instanceof File && logoFile.size > 0 ? await saveClubLogo(logoFile, name) : existingLogo
  const club = await prisma.club.create({ data: { name, uid, logo, color } })
  invalidatePublicData()
  return NextResponse.json(club, { status: 201 })
}
