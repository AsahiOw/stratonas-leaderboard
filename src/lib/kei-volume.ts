export const KEI_VOLUME_KEY = 'stratonas:kei-volume'
export const DEFAULT_KEI_VOLUME = 0.8

function clamp(value: number) {
  return Math.min(1, Math.max(0, value))
}

export function getKeiVolume(): number {
  if (typeof window === 'undefined') return DEFAULT_KEI_VOLUME
  const raw = window.localStorage.getItem(KEI_VOLUME_KEY)
  if (raw == null) return DEFAULT_KEI_VOLUME
  const value = Number(raw)
  return Number.isFinite(value) ? clamp(value) : DEFAULT_KEI_VOLUME
}

export function setKeiVolume(value: number) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEI_VOLUME_KEY, String(clamp(value)))
}
