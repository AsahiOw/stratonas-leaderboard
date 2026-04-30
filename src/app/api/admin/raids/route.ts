import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { Server, RaidStatus } from '@prisma/client'

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard
  const raids = await prisma.raid.findMany({ orderBy: [{ status: 'asc' }, { startDate: 'desc' }] })
  return NextResponse.json(raids)
}

export async function POST(req: Request) {
  const guard = await requireAdmin()
  if (guard) return guard
  const body = await req.json()
  const raid = await prisma.raid.create({
    data: {
      name: body.name,
      episode: body.episode || null,
      season: body.season || null,
      server: body.server === 'JP' ? Server.JP : Server.GLOBAL,
      status: body.status === 'PREVIOUS' ? RaidStatus.PREVIOUS : RaidStatus.CURRENT,
      color: body.color || '#4f8ef7',
      color2: body.color2 || '#7c3aed',
      pattern: body.pattern || 'hex',
      desc: body.desc || null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
    },
  })
  return NextResponse.json(raid, { status: 201 })
}
