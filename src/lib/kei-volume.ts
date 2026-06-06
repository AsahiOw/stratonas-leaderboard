export const KEI_VOLUME_KEY = 'stratonas:kei-volume'
export const KEI_GREETING_ENABLED_KEY = 'stratonas:kei-greeting-enabled'
export const KEI_GREETING_ENABLED_EVENT = 'stratonas:kei-greeting-enabled-change'
export const KEI_GREETING_REQUEST_EVENT = 'stratonas:kei-greeting-request'
export const DEFAULT_KEI_VOLUME = 0.8
export const DEFAULT_KEI_GREETING_ENABLED = true

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

export function isKeiGreetingEnabled(): boolean {
  if (typeof window === 'undefined') return DEFAULT_KEI_GREETING_ENABLED
  const raw = window.localStorage.getItem(KEI_GREETING_ENABLED_KEY)
  if (raw == null) return DEFAULT_KEI_GREETING_ENABLED
  return raw === 'true'
}

export function setKeiGreetingEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEI_GREETING_ENABLED_KEY, String(enabled))
  window.dispatchEvent(new CustomEvent(KEI_GREETING_ENABLED_EVENT, { detail: enabled }))
}

export function requestKeiGreeting() {
  if (typeof window === 'undefined' || !isKeiGreetingEnabled()) return
  window.dispatchEvent(new Event(KEI_GREETING_REQUEST_EVENT))
}
