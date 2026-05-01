import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { normalizeStudentId, studentImageUrl } from '@/lib/students'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard
  const students = await prisma.student.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(students)
}

export async function POST(req: Request) {
  const guard = await requireAdmin()
  if (guard) return guard
  const body = await req.json()
  const id = normalizeStudentId(body.id)
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const image = typeof body.image === 'string' && body.image.trim() ? body.image.trim() : id ? studentImageUrl(id) : ''

  if (!id || !name || !image) {
    return NextResponse.json({ error: 'Student id, name, and image are required' }, { status: 400 })
  }

  const student = await prisma.student.create({ data: { id, name, image } })
  return NextResponse.json(student, { status: 201 })
}
