export function studentImageUrl(id: number): string {
  return `https://schaledb.com/images/student/collection/${id}.webp`
}

export function normalizeStudentId(value: unknown): number | null {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}
