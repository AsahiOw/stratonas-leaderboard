export function studentImageUrl(id: number): string {
  return `https://schaledb.com/images/student/collection/${id}.webp`
}

export function studentPortraitUrl(id: number): string {
  return `https://schaledb.com/images/student/portrait/${id}.webp`
}

export function normalizeStudentId(value: unknown): number | null {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export function normalizeStudentName(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function normalizePortraitOffsetNumber(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === '') return fallback

  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function normalizePortraitScale(value: unknown): number {
  const number = normalizePortraitOffsetNumber(value, 1)
  return number > 0 ? number : 1
}

export function normalizeOptionalStudentText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function normalizeStudentBirthDay(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (!match) return trimmed || null

  const month = Number(match[1])
  const day = Number(match[2])
  if (!Number.isInteger(month) || month < 1 || month > 12) return null
  if (!Number.isInteger(day) || day < 1 || day > 31) return null
  return `${month}/${day}`
}

export function normalizeStudentAccentColor(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return /^oklch\(\d*\.?\d+\s+\d*\.?\d+\s+\d*\.?\d+\)$/.test(trimmed) ? trimmed : null
}

export function normalizeStudentCardFields(body: Record<string, unknown>) {
  return {
    familyName: normalizeOptionalStudentText(body.familyName),
    personalName: normalizeOptionalStudentText(body.personalName),
    school: normalizeOptionalStudentText(body.school),
    club: normalizeOptionalStudentText(body.club),
    schoolYear: normalizeOptionalStudentText(body.schoolYear),
    characterAge: normalizeOptionalStudentText(body.characterAge),
    characterVoice: normalizeOptionalStudentText(body.characterVoice),
    birthday: normalizeOptionalStudentText(body.birthday),
    birthDay: normalizeStudentBirthDay(body.birthDay),
    hobby: normalizeOptionalStudentText(body.hobby),
    heightMetric: normalizeOptionalStudentText(body.heightMetric),
    weaponType: normalizeOptionalStudentText(body.weaponType),
    tacticRole: normalizeOptionalStudentText(body.tacticRole),
    position: normalizeOptionalStudentText(body.position),
    weaponName: normalizeOptionalStudentText(body.weaponName),
    accentColor: normalizeStudentAccentColor(body.accentColor),
  }
}
