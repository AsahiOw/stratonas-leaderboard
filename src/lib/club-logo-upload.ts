import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

const CLUB_LOGO_DIR = path.join(process.cwd(), 'public', 'assets', 'club')

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'club'
}

function extensionFor(file: File) {
  const typeExt = file.type.split('/')[1]
  const nameExt = path.extname(file.name).slice(1)
  const ext = (typeExt || nameExt || 'png').toLowerCase()
  return ext === 'jpeg' ? 'jpg' : ext
}

export async function saveClubLogo(file: File, clubName: string) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Club logo must be an image file.')
  }

  await mkdir(CLUB_LOGO_DIR, { recursive: true })
  const filename = `${slugify(clubName)}-${Date.now()}.${extensionFor(file)}`
  await writeFile(path.join(CLUB_LOGO_DIR, filename), Buffer.from(await file.arrayBuffer()))
  return `/assets/club/${filename}`
}
