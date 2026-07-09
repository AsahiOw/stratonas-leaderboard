import { mkdir, rm, writeFile } from 'fs/promises'
import path from 'path'

const CUSTOM_STUDENT_ASSET_PREFIX = '/assets/custom-student/'
export const CUSTOM_STUDENT_ASSET_DIR = path.join(process.cwd(), 'public', 'assets', 'custom-student')

function extensionFor(file: File) {
  const typeExt = file.type.split('/')[1]
  const nameExt = path.extname(file.name).slice(1)
  const ext = (typeExt || nameExt || 'png').toLowerCase()
  return ext === 'jpeg' ? 'jpg' : ext
}

function customStudentMediaPath(studentId: number, value: string | null | undefined) {
  if (!value?.startsWith(`${CUSTOM_STUDENT_ASSET_PREFIX}${studentId}/`)) return null

  const filename = path.basename(value)
  if (!filename || filename !== value.slice(`${CUSTOM_STUDENT_ASSET_PREFIX}${studentId}/`.length)) return null

  return path.join(CUSTOM_STUDENT_ASSET_DIR, String(studentId), filename)
}

export async function saveCustomStudentMedia(file: File, studentId: number, kind: 'image' | 'portrait') {
  if (!file.type.startsWith('image/')) {
    throw new Error('Student media must be an image file.')
  }

  const studentDir = path.join(CUSTOM_STUDENT_ASSET_DIR, String(studentId))
  await mkdir(studentDir, { recursive: true })

  const filename = `${kind}-${Date.now()}.${extensionFor(file)}`
  await writeFile(path.join(studentDir, filename), Buffer.from(await file.arrayBuffer()))
  return `${CUSTOM_STUDENT_ASSET_PREFIX}${studentId}/${filename}`
}

export async function deleteCustomStudentMedia(studentId: number, value: string | null | undefined) {
  const mediaPath = customStudentMediaPath(studentId, value)
  if (!mediaPath) return

  await rm(mediaPath, { force: true })
}

export async function deleteCustomStudentMediaFolder(studentId: number) {
  await rm(path.join(CUSTOM_STUDENT_ASSET_DIR, String(studentId)), { recursive: true, force: true })
}
