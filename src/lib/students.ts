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
