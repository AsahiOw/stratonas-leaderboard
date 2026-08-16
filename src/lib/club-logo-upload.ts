import { mkdir, rm, writeFile } from 'fs/promises'
import path from 'path'
import { validateImage } from '@/lib/image-upload'

export const CLUB_LOGO_DIR = path.join(process.cwd(), 'public', 'assets', 'club')

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'club'
}

export async function saveClubLogo(file: File, clubName: string) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Club logo must be an image file.')
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const extension = await validateImage(buffer)
  await mkdir(CLUB_LOGO_DIR, { recursive: true })
  const filename = `${slugify(clubName)}-${Date.now()}.${extension}`
  await writeFile(path.join(CLUB_LOGO_DIR, filename), buffer)
  return `/assets/club/${filename}`
}

export async function deleteClubLogo(logo: string | null | undefined) {
  if (!logo?.startsWith('/assets/club/')) return

  const filename = path.basename(logo)
  if (!filename || filename !== logo.slice('/assets/club/'.length)) return

  await rm(path.join(CLUB_LOGO_DIR, filename), { force: true })
}
