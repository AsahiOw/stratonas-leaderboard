const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const UTC_PLUS_7_OFFSET_MS = 7 * HOUR_MS
const ROLLOVER_AFTER_LOCAL_MIDNIGHT_MS = 2 * HOUR_MS
const BIRTHDAY_DAY_SHIFT_MS = UTC_PLUS_7_OFFSET_MS - ROLLOVER_AFTER_LOCAL_MIDNIGHT_MS
const MONTH_DAY_RE = /^(\d{1,2})\/(\d{1,2})$/

export function parseBirthdayKey(key?: string | null) {
  const match = key?.trim().match(MONTH_DAY_RE)
  if (!match) return null

  const month = Number(match[1])
  const day = Number(match[2])
  if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }

  return { month, day, key: `${month}/${day}` }
}

export function getBirthdayDay(now = new Date()) {
  const shifted = new Date(now.getTime() + BIRTHDAY_DAY_SHIFT_MS)
  const month = shifted.getUTCMonth() + 1
  const day = shifted.getUTCDate()

  return {
    month,
    day,
    key: `${month}/${day}`,
  }
}

export function getDaysUntilBirthday(key?: string | null, now = new Date()) {
  const birthday = parseBirthdayKey(key)
  if (!birthday) return null

  const shifted = new Date(now.getTime() + BIRTHDAY_DAY_SHIFT_MS)
  const today = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate())
  let target = Date.UTC(shifted.getUTCFullYear(), birthday.month - 1, birthday.day)
  if (target < today) target = Date.UTC(shifted.getUTCFullYear() + 1, birthday.month - 1, birthday.day)

  return Math.round((target - today) / DAY_MS)
}

export function getNextBirthdayRefreshAt(now = new Date()) {
  const shiftedNow = now.getTime() + BIRTHDAY_DAY_SHIFT_MS
  const shifted = new Date(shiftedNow)
  const nextShiftedMidnight = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() + 1,
    0,
    0,
    0,
    0
  )

  return new Date(nextShiftedMidnight - BIRTHDAY_DAY_SHIFT_MS)
}

export function getNextBirthdayRefreshDelay(now = new Date()) {
  const delay = getNextBirthdayRefreshAt(now).getTime() - now.getTime()
  return Math.max(1000, Math.min(delay + 1000, DAY_MS + 1000))
}
