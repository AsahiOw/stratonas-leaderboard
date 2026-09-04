export const MOMOTALK_ICON_VISIBLE_KEY = 'stratonas:momotalk-icon-visible'
export const MOMOTALK_ICON_VISIBLE_EVENT = 'stratonas:momotalk-icon-visible-change'
export const DEFAULT_MOMOTALK_ICON_VISIBLE = true

export function isMomotalkIconVisible(): boolean {
  if (typeof window === 'undefined') return DEFAULT_MOMOTALK_ICON_VISIBLE
  const raw = window.localStorage.getItem(MOMOTALK_ICON_VISIBLE_KEY)
  return raw == null ? DEFAULT_MOMOTALK_ICON_VISIBLE : raw === 'true'
}

export function setMomotalkIconVisible(visible: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MOMOTALK_ICON_VISIBLE_KEY, String(visible))
  window.dispatchEvent(new CustomEvent(MOMOTALK_ICON_VISIBLE_EVENT, { detail: visible }))
}
