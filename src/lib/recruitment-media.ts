import { mkdir, unlink, writeFile } from 'fs/promises'
import path from 'path'
import { readLimitedResponse, safeFetch } from '@/lib/safe-fetch'
import { validateImage } from '@/lib/image-upload'

export type RecruitmentAssetKind = 'banner' | 'animation'
export type ResolvedRecruitmentAsset = { path: string; created: boolean }

const GACHA_DIR = path.join(process.cwd(), 'public', 'assets', 'gacha')
export const GACHA_ASSET_DIRS: Record<RecruitmentAssetKind, string> = {
  banner: path.join(GACHA_DIR, 'banner'),
  animation: path.join(GACHA_DIR, 'animation'),
}
const GACHA_ASSET_PREFIXES: Record<RecruitmentAssetKind, string> = {
  banner: '/assets/gacha/banner/',
  animation: '/assets/gacha/animation/',
}
const IMAGE_EXTENSIONS = new Set(['avif', 'gif', 'jpg', 'jpeg', 'png', 'webp'])
const VIDEO_EXTENSIONS = new Set(['m4v', 'mov', 'mp4', 'webm'])
const MAX_BANNER_BYTES = 10 * 1024 * 1024
const MAX_ANIMATION_BYTES = 250 * 1024 * 1024

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'recruitment'
}

function extensionFromName(value: string) {
  return path.extname(new URL(value, 'http://local.invalid').pathname).slice(1).toLowerCase()
}

function extensionFromContentType(contentType: string, kind: RecruitmentAssetKind) {
  const type = contentType.split(';')[0]?.trim().toLowerCase()
  if (!type) return null
  if (type === 'image/jpeg') return 'jpg'
  if (type === 'video/quicktime') return 'mov'
  const [group, subtype] = type.split('/')
  if (kind === 'banner' && group === 'image' && subtype) return subtype
  if (kind === 'animation' && group === 'video' && subtype) return subtype
  return null
}

function allowedExtensions(kind: RecruitmentAssetKind) {
  return kind === 'banner' ? IMAGE_EXTENSIONS : VIDEO_EXTENSIONS
}

function fallbackExtension(kind: RecruitmentAssetKind) {
  return kind === 'banner' ? 'png' : 'mp4'
}

function isAllowedContent(contentType: string, ext: string, kind: RecruitmentAssetKind) {
  const type = contentType.split(';')[0]?.trim().toLowerCase()
  const expectedGroup = kind === 'banner' ? 'image/' : 'video/'
  return type.startsWith(expectedGroup) || allowedExtensions(kind).has(ext)
}

function filenameFor(kind: RecruitmentAssetKind, studentName: string, ext: string) {
  return `${slugify(studentName)}-${kind}-${Date.now()}.${ext}`
}

function validateVideo(buffer: Buffer, ext: string) {
  const isIsoMedia = buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp'
  const isWebm = buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
  if ((ext === 'webm' && !isWebm) || (ext !== 'webm' && !isIsoMedia)) {
    throw new Error('Recruitment animation file is invalid or unsupported.')
  }
}

function assetUrl(kind: RecruitmentAssetKind, filename: string) {
  return `${GACHA_ASSET_PREFIXES[kind]}${filename}`
}

function localPathForAsset(value: string, kind: RecruitmentAssetKind) {
  const prefix = GACHA_ASSET_PREFIXES[kind]
  if (!value.startsWith(prefix)) return null

  const filename = value.slice(prefix.length)
  if (!filename || filename.includes('/') || filename.includes('\\')) return null

  const dir = path.resolve(/*turbopackIgnore: true*/ GACHA_ASSET_DIRS[kind])
  const resolved = path.resolve(dir, filename)
  return resolved.startsWith(`${dir}${path.sep}`) ? resolved : null
}

function isExistingGachaAsset(value: string, kind: RecruitmentAssetKind) {
  return Boolean(localPathForAsset(value, kind))
}

async function saveAssetBuffer(buffer: Buffer, kind: RecruitmentAssetKind, studentName: string, ext: string) {
  if (kind === 'animation') validateVideo(buffer, ext)
  const safeExtension = kind === 'banner' ? await validateImage(buffer) : ext
  await mkdir(GACHA_ASSET_DIRS[kind], { recursive: true })
  const filename = filenameFor(kind, studentName, safeExtension)
  await writeFile(path.join(GACHA_ASSET_DIRS[kind], filename), buffer)
  return { path: assetUrl(kind, filename), created: true }
}

async function saveUploadedAsset(file: File, kind: RecruitmentAssetKind, studentName: string) {
  const maxBytes = kind === 'banner' ? MAX_BANNER_BYTES : MAX_ANIMATION_BYTES
  if (file.size > maxBytes) throw new Error('Uploaded media exceeds the size limit.')
  const nameExt = extensionFromName(file.name)
  const typeExt = extensionFromContentType(file.type, kind)
  const ext = allowedExtensions(kind).has(typeExt || '') ? typeExt! : allowedExtensions(kind).has(nameExt) ? nameExt : fallbackExtension(kind)

  if (!isAllowedContent(file.type, ext, kind)) {
    throw new Error(kind === 'banner' ? 'Recruitment banner must be an image file.' : 'Recruitment animation must be a video file.')
  }

  return saveAssetBuffer(Buffer.from(await file.arrayBuffer()), kind, studentName, ext)
}

async function downloadAsset(url: string, kind: RecruitmentAssetKind, studentName: string) {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Enter a valid media URL.')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Media URL must start with http:// or https://.')
  }

  const response = await safeFetch(parsed, { timeoutMs: 30_000 })
  if (!response.ok) throw new Error(`Media download failed with ${response.status}.`)

  const contentType = response.headers.get('content-type') || ''
  const nameExt = extensionFromName(parsed.href)
  const typeExt = extensionFromContentType(contentType, kind)
  const ext = allowedExtensions(kind).has(typeExt || '') ? typeExt! : allowedExtensions(kind).has(nameExt) ? nameExt : fallbackExtension(kind)

  if (!isAllowedContent(contentType, ext, kind)) {
    throw new Error(kind === 'banner' ? 'Recruitment banner URL must point to an image.' : 'Recruitment animation URL must point to a video.')
  }

  const buffer = await readLimitedResponse(
    response,
    kind === 'banner' ? MAX_BANNER_BYTES : MAX_ANIMATION_BYTES,
    kind === 'banner' ? 30_000 : 120_000,
  )
  if (buffer.length === 0) throw new Error('Downloaded media file is empty.')
  return saveAssetBuffer(buffer, kind, studentName, ext)
}

export async function resolveRecruitmentAsset(options: {
  file: FormDataEntryValue | null
  value: FormDataEntryValue | null
  kind: RecruitmentAssetKind
  studentName: string
}) {
  const file = options.file
  if (file instanceof File && file.size > 0) {
    return saveUploadedAsset(file, options.kind, options.studentName)
  }

  const value = typeof options.value === 'string' ? options.value.trim() : ''
  if (!value) {
    throw new Error(options.kind === 'banner' ? 'Recruitment banner is required.' : 'Recruitment animation is required.')
  }
  if (isExistingGachaAsset(value, options.kind)) return { path: value, created: false }
  if (/^https?:\/\//i.test(value)) return downloadAsset(value, options.kind, options.studentName)

  throw new Error(
    options.kind === 'banner'
      ? 'Recruitment banner must be uploaded, a URL, or an existing gacha banner path.'
      : 'Recruitment animation must be uploaded, a URL, or an existing gacha animation path.'
  )
}

export async function deleteRecruitmentAsset(value: string | null | undefined, kind: RecruitmentAssetKind) {
  if (!value) return
  const localPath = localPathForAsset(value, kind)
  if (!localPath) return

  try {
    await unlink(localPath)
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? (error as { code?: string }).code : null
    if (code === 'ENOENT') return
    throw error
  }
}
