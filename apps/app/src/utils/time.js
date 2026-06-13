/**
 * Date/time formatters. Each absolute formatter accepts an optional `timeZone`
 * (an IANA zone like "Asia/Tokyo") and renders in that zone, falling back to UTC
 * for empty or unknown zones. Relative labels ("5m ago") are zone-independent.
 */

const FALLBACK_TZ = "UTC"

// Zones already proven valid, so the validation formatter is built at most once
// per distinct zone (a signed-in user has exactly one timezone).
const validatedZones = new Set([FALLBACK_TZ])

/**
 * Returns a usable IANA time zone, falling back to UTC for empty/invalid values.
 * @param {string} [timeZone] - Candidate IANA zone.
 * @returns {string} A zone safe to pass to Intl.
 */
function safeZone(timeZone) {
  if (!timeZone) return FALLBACK_TZ
  if (validatedZones.has(timeZone)) return timeZone
  try {
    new Intl.DateTimeFormat("en-US", { timeZone })
    validatedZones.add(timeZone)
    return timeZone
  } catch {
    return FALLBACK_TZ
  }
}

/**
 * Formats a date as a human-readable relative time label.
 * Returns "Just now", "Xm ago", "Xh ago", a tz-aware weekday, or a tz-aware short date.
 * @param {string|null} dateStr - ISO date string or any value parseable by Date.
 * @param {{ timeZone?: string }} [opts] - Optional IANA time zone for the absolute branches.
 * @returns {string} Relative time label, or empty string if dateStr is falsy.
 */
export function relativeTime(dateStr, { timeZone } = {}) {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  const diff = (Date.now() - date) / 1000
  if (diff < 60) return "Just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  const zone = safeZone(timeZone)
  if (diff < 604800) {
    return new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: zone }).format(date)
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: zone,
  }).format(date)
}

/**
 * Short date, e.g. "Jun 13", in the given time zone.
 * @param {string|null} dateStr - ISO date string.
 * @param {{ timeZone?: string }} [opts] - Optional IANA time zone.
 * @returns {string} Formatted date, or empty string if dateStr is falsy.
 */
export function shortDate(dateStr, { timeZone } = {}) {
  if (!dateStr) return ""
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: safeZone(timeZone),
  }).format(new Date(dateStr))
}

/**
 * Locale-formatted calendar date (e.g. "6/13/2026") in the given time zone.
 * @param {string|null} dateStr - ISO date string.
 * @param {{ timeZone?: string }} [opts] - Optional IANA time zone.
 * @returns {string} Formatted date, or empty string if dateStr is falsy.
 */
export function calendarDate(dateStr, { timeZone } = {}) {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleDateString(undefined, { timeZone: safeZone(timeZone) })
}

/**
 * Clock time, e.g. "3:04 PM", in the given time zone.
 * @param {string|null} dateStr - ISO date string.
 * @param {{ timeZone?: string }} [opts] - Optional IANA time zone.
 * @returns {string} Formatted time, or empty string if dateStr is falsy.
 */
export function clockTime(dateStr, { timeZone } = {}) {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: safeZone(timeZone),
  })
}

/**
 * 24-hour time with seconds, e.g. "11:12:30", in the given time zone.
 * @param {string|null} dateStr - ISO date string.
 * @param {{ timeZone?: string }} [opts] - Optional IANA time zone.
 * @returns {string} Formatted time, or empty string if dateStr is falsy.
 */
export function timeOfDay(dateStr, { timeZone } = {}) {
  if (!dateStr) return ""
  const formatted = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: safeZone(timeZone),
  }).format(new Date(dateStr))
  // Some ICU builds emit "24:MM:SS" for midnight with hour12:false; normalize to "00".
  return formatted.replace(/^24:/, "00:")
}

/**
 * Hour of day (0–23) for the date as seen in the given time zone. Useful for
 * time-of-day logic such as greetings, where only the hour matters.
 * @param {string|Date|null} date - ISO date string or Date.
 * @param {{ timeZone?: string }} [opts] - Optional IANA time zone.
 * @returns {number|null} Hour in 0–23, or null if date is falsy.
 */
export function hourOfDay(date, { timeZone } = {}) {
  if (!date) return null
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: safeZone(timeZone),
    }).format(new Date(date)),
  )
  // Some ICU builds emit "24" for midnight with hour12:false; normalize to 0.
  return hour % 24
}

/**
 * Full absolute timestamp, e.g. "Jun 4, 2026 · 11:12:30", in the given time zone.
 * @param {string|null} dateStr - ISO date string.
 * @param {{ timeZone?: string }} [opts] - Optional IANA time zone.
 * @returns {string} Formatted timestamp, or empty string if dateStr is falsy.
 */
export function absoluteDateTime(dateStr, { timeZone } = {}) {
  if (!dateStr) return ""
  const zone = safeZone(timeZone)
  const day = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: zone,
  }).format(new Date(dateStr))
  return `${day} · ${timeOfDay(dateStr, { timeZone: zone })}`
}

/**
 * ISO calendar-day key (YYYY-MM-DD) for the date as seen in the given time zone.
 * @param {string|null} dateStr - ISO date string.
 * @param {{ timeZone?: string }} [opts] - Optional IANA time zone.
 * @returns {string} Day key, or empty string if dateStr is falsy.
 */
export function dayKey(dateStr, { timeZone } = {}) {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleDateString("en-CA", { timeZone: safeZone(timeZone) })
}

/**
 * Whole calendar days between the date and "now", both evaluated in the given
 * time zone. 0 = same calendar day, 1 = yesterday, etc.
 * @param {string|null} dateStr - ISO date string.
 * @param {{ timeZone?: string }} [opts] - Optional IANA time zone.
 * @returns {number|null} Day count, or null if dateStr is falsy.
 */
export function calendarDaysAgo(dateStr, { timeZone } = {}) {
  if (!dateStr) return null
  const zone = safeZone(timeZone)
  const itemKey = dayKey(dateStr, { timeZone: zone })
  const nowKey = dayKey(new Date().toISOString(), { timeZone: zone })
  return Math.round(
    (Date.parse(`${nowKey}T00:00:00Z`) - Date.parse(`${itemKey}T00:00:00Z`)) / 86_400_000,
  )
}
