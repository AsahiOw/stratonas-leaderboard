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

function recruitmentErrorResponse(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return NextResponse.json({ error: 'This student already has a recruitment.' }, { status: 409 })
  }
  const message = error instanceof Error ? error.message : 'Could not save recruitment.'
  return NextResponse.json({ error: message }, { status: 400 })
}

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard

  const recruitments = await prisma.recruitment.findMany({
    include: recruitmentInclude,
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(recruitments)
}

export async function POST(req: Request) {
  const guard = await requireAdmin()
  if (guard) return guard

  let banner: ResolvedRecruitmentAsset | null = null
  let animation: ResolvedRecruitmentAsset | null = null

  try {
    const form = await req.formData()
    const studentId = normalizeStudentId(form.get('studentId'))
    if (!studentId) return NextResponse.json({ error: 'Student is required.' }, { status: 400 })

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true },
    })
    if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })

    const duplicate = await prisma.recruitment.findUnique({ where: { studentId } })
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

    const recruitment = await prisma.recruitment.create({
      data: {
        studentId,
        bannerPath: banner.path,
        animationPath: animation.path,
      },
      include: recruitmentInclude,
    })
    invalidatePublicData([PUBLIC_CACHE_TAGS.recruitments])
    return NextResponse.json(recruitment, { status: 201 })
  } catch (error) {
    await cleanupCreatedAssets([
      { asset: banner, kind: 'banner' },
      { asset: animation, kind: 'animation' },
    ])
    return recruitmentErrorResponse(error)
  }
}
