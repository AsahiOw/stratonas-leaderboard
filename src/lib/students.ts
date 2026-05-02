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
