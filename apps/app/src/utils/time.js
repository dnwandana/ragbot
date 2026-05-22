/**
 * Formats a date string as a human-readable relative time label.
 * Returns "Just now", "Xm ago", "Xh ago", a day abbreviation, or a short date.
 *
 * @param {string|null} dateStr - ISO date string or any value parseable by Date.
 * @returns {string} Relative time label, or empty string if dateStr is falsy.
 */
export function relativeTime(dateStr) {
  if (!dateStr) return ""
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return "Just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  const d = new Date(dateStr)
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  if (diff < 604800) return days[d.getDay()]
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
