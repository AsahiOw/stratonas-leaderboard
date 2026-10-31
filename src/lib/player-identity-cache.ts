export const PLAYER_IDENTITY_STORAGE_KEY = 'stratonas:player-identity:v1'
// Covers the public API's 60s shared TTL plus 300s stale-while-revalidate window.
export const PLAYER_IDENTITY_TTL_MS = 6 * 60 * 1000

export type LocalStudentIdentity = {
  id: number; name: string; image: string; portrait?: string | null; memorial?: string | null
  portraitOffsetX?: number; portraitOffsetY?: number; portraitScale?: number
  memorialOffsetX?: number; memorialOffsetY?: number; memorialScale?: number
}
export type SavedPlayerIdentity = {
  userId: string; playerId: string; ign: string; favouriteStudentData: LocalStudentIdentity | null; expiresAt: number
}

export function readPlayerIdentity(value: string | null, userId: string, now = Date.now()): SavedPlayerIdentity | null {
  try {
    const data = JSON.parse(value || 'null')
    if (!data || data.userId !== userId || typeof data.playerId !== 'string' || !data.playerId || typeof data.ign !== 'string'
      || !Number.isFinite(data.expiresAt) || data.expiresAt <= now || data.expiresAt > now + PLAYER_IDENTITY_TTL_MS) return null
    const student = data.favouriteStudentData
    if (student !== null && (!student || !Number.isInteger(student.id) || typeof student.name !== 'string' || typeof student.image !== 'string')) return null
    return data
  } catch { return null }
}

/** Overlay only the edited player's public identity, leaving all statistics untouched. */
export function applyPlayerIdentity<T>(data: T, saved: SavedPlayerIdentity | null, now = Date.now()): T {
  if (!saved || saved.expiresAt <= now) return data
  const identity = saved
  const student = saved.favouriteStudentData
  function visit(value: unknown): unknown {
    if (Array.isArray(value)) {
      const next = value.map(visit)
      return next.some((item, index) => item !== value[index]) ? next : value
    }
    if (!value || typeof value !== 'object' || value instanceof Date) return value
    const original = value as Record<string, unknown>
    const next = Object.fromEntries(Object.entries(original).map(([key, item]) => [key, visit(item)]))
    const ownPlayer = original.id === identity.playerId && typeof original.ign === 'string'
    const ownEntry = original.playerId === identity.playerId
    if (ownPlayer || ownEntry) {
      const fields: Record<string, unknown> = {
        ign: identity.ign, ...(ownEntry ? { name: identity.ign, playerName: identity.ign } : {}),
        favouriteStudent: student?.name || null, favouriteStudentId: student?.id || null,
        favouriteStudentData: student, favouriteStudentImage: student?.image || null,
        favouriteStudentPortrait: student?.portrait || student?.image || null, favouriteStudentMemorial: student?.memorial || null,
        favouriteStudentPortraitOffset: student ? { x: student.portraitOffsetX ?? 0, y: student.portraitOffsetY ?? 0, scale: student.portraitScale ?? 1 } : null,
        favouriteStudentMemorialOffset: student ? { x: student.memorialOffsetX ?? -7.6, y: student.memorialOffsetY ?? 0, scale: student.memorialScale ?? .5 } : null,
      }
      for (const [key, item] of Object.entries(fields)) if (key in original) next[key] = item
    }
    return Object.keys(next).some(key => next[key] !== original[key]) ? next : value
  }
  return visit(data) as T
}
