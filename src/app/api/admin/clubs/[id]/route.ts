import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { invalidatePublicData } from '@/lib/cache'
import { deleteClubLogo, saveClubLogo } from '@/lib/club-logo-upload'

export const runtime = 'nodejs'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const { id } = await params

  const form = await req.formData()
  const logoFile = form.get('logoFile')
  const existingLogo = typeof form.get('logo') === 'string' && String(form.get('logo')).trim() ? String(form.get('logo')).trim() : null
  const name = typeof form.get('name') === 'string' ? String(form.get('name')).trim() : ''
  const uid = typeof form.get('uid') === 'string' && String(form.get('uid')).trim() ? String(form.get('uid')).trim() : null
  const color = typeof form.get('color') === 'string' && String(form.get('color')).trim() ? String(form.get('color')).trim() : '#4f8ef7'
  if (!name) return NextResponse.json({ error: 'Club name is required.' }, { status: 400 })

  const duplicate = await prisma.club.findFirst({
    where: {
      id: { not: id },
      name: { equals: name, mode: 'insensitive' },
    },
  })
  if (duplicate) return NextResponse.json({ error: 'Club already exists.' }, { status: 409 })

  const currentClub = await prisma.club.findUnique({
    where: { id },
    select: { logo: true },
  })
  if (!currentClub) return NextResponse.json({ error: 'Club not found.' }, { status: 404 })

  const logo = logoFile instanceof File && logoFile.size > 0 ? await saveClubLogo(logoFile, name) : existingLogo
  const club = await prisma.club.update({
    where: { id },
    data: { name, uid, logo, color },
  })
  if (currentClub.logo && currentClub.logo !== logo) {
    await deleteClubLogo(currentClub.logo).catch(() => undefined)
  }
  await prisma.player.updateMany({
    where: { clubId: id },
    data: { club: name, clubID: uid },
  })

  invalidatePublicData()
  return NextResponse.json(club)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const { id } = await params

  await prisma.player.updateMany({
    where: { clubId: id },
    data: { clubId: null },
  })
  await prisma.club.delete({ where: { id } })
  invalidatePublicData()
  return NextResponse.json({ ok: true })
}
