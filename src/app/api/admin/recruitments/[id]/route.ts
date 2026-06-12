import { NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { invalidatePublicData, PUBLIC_CACHE_TAGS } from '@/lib/cache'
import { deleteRecruitmentAsset, resolveRecruitmentAsset, type ResolvedRecruitmentAsset } from '@/lib/recruitment-media'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const recruitmentInclude = {
  student: {
    select: {
      id: true,
      name: true,
      image: true,
      characterVoice: true,
    },
  },
} as const

function normalizeStudentId(value: FormDataEntryValue | null) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

async function cleanupCreatedAssets(assets: Array<{ asset: ResolvedRecruitmentAsset | null; kind: 'banner' | 'animation' }>) {
  await Promise.all(
    assets.map(({ asset, kind }) => asset?.created ? deleteRecruitmentAsset(asset.path, kind) : Promise.resolve())
  )
}

function notFoundResponse(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    return NextResponse.json({ error: 'Recruitment not found.' }, { status: 404 })
  }
  return null
}

function recruitmentErrorResponse(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'This student already has a recruitment.' }, { status: 409 })
    if (error.code === 'P2025') return NextResponse.json({ error: 'Recruitment not found.' }, { status: 404 })
  }
  const message = error instanceof Error ? error.message : 'Could not save recruitment.'
  return NextResponse.json({ error: message }, { status: 400 })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const { id } = await params

  let banner: ResolvedRecruitmentAsset | null = null
  let animation: ResolvedRecruitmentAsset | null = null
  let committed = false

  try {
    const current = await prisma.recruitment.findUnique({ where: { id } })
    if (!current) return NextResponse.json({ error: 'Recruitment not found.' }, { status: 404 })

    const form = await req.formData()
    const studentId = normalizeStudentId(form.get('studentId'))
    if (!studentId) return NextResponse.json({ error: 'Student is required.' }, { status: 400 })

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true },
    })
    if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })

    const duplicate = await prisma.recruitment.findFirst({
      where: {
        studentId,
        id: { not: id },
      },
    })
    if (duplicate) return NextResponse.json({ error: 'This student already has a recruitment.' }, { status: 409 })

    banner = await resolveRecruitmentAsset({
      file: form.get('bannerFile'),
      value: form.get('bannerPath'),
      kind: 'banner',
      studentName: student.name,
    })
    animation = await resolveRecruitmentAsset({
      file: form.get('animationFile'),
      value: form.get('animationPath'),
      kind: 'animation',
      studentName: student.name,
    })

    const recruitment = await prisma.recruitment.update({
      where: { id },
      data: {
        studentId,
        bannerPath: banner.path,
        animationPath: animation.path,
      },
      include: recruitmentInclude,
    })
    committed = true

    if (current.bannerPath !== banner.path) await deleteRecruitmentAsset(current.bannerPath, 'banner')
    if (current.animationPath !== animation.path) await deleteRecruitmentAsset(current.animationPath, 'animation')

    invalidatePublicData([PUBLIC_CACHE_TAGS.recruitments])
    return NextResponse.json(recruitment)
  } catch (error) {
    if (!committed) {
      await cleanupCreatedAssets([
        { asset: banner, kind: 'banner' },
        { asset: animation, kind: 'animation' },
      ])
    }
    const notFound = notFoundResponse(error)
    if (notFound) return notFound
    return recruitmentErrorResponse(error)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const { id } = await params

  try {
    const current = await prisma.recruitment.findUnique({ where: { id } })
    if (!current) return NextResponse.json({ error: 'Recruitment not found.' }, { status: 404 })

    await prisma.recruitment.delete({ where: { id } })
    await Promise.all([
      deleteRecruitmentAsset(current.bannerPath, 'banner'),
      deleteRecruitmentAsset(current.animationPath, 'animation'),
    ])

    invalidatePublicData([PUBLIC_CACHE_TAGS.recruitments])
    return NextResponse.json({ ok: true })
  } catch (error) {
    const notFound = notFoundResponse(error)
    if (notFound) return notFound
    return NextResponse.json({ error: 'Could not delete recruitment.' }, { status: 500 })
  }
}
