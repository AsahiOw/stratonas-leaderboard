import { mkdir, rm, writeFile } from 'fs/promises'
import path from 'path'
import { validateImage } from '@/lib/image-upload'

const CUSTOM_STUDENT_ASSET_PREFIX = '/assets/custom-student/'
export const CUSTOM_STUDENT_ASSET_DIR = path.join(process.cwd(), 'public', 'assets', 'custom-student')

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

  const buffer = Buffer.from(await file.arrayBuffer())
  const extension = await validateImage(buffer)
  const studentDir = path.join(CUSTOM_STUDENT_ASSET_DIR, String(studentId))
  await mkdir(studentDir, { recursive: true })

  const filename = `${kind}-${Date.now()}.${extension}`
  await writeFile(path.join(studentDir, filename), buffer)
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
