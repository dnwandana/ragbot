import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  relativeTime,
  shortDate,
  calendarDate,
  clockTime,
  absoluteDateTime,
  timeOfDay,
  hourOfDay,
  dayKey,
  calendarDaysAgo,
} from "@/utils/time"

const INSTANT = "2026-06-04T03:12:30Z" // 23:12:30 in New York, 12:12:30 in Tokyo
const NY = "America/New_York"
const TOKYO = "Asia/Tokyo"

describe("timeZone-aware absolute formatters", () => {
  it("dayKey resolves the calendar day in the target zone", () => {
    expect(dayKey(INSTANT, { timeZone: NY })).toBe("2026-06-03")
    expect(dayKey(INSTANT, { timeZone: TOKYO })).toBe("2026-06-04")
    expect(dayKey(INSTANT, { timeZone: "UTC" })).toBe("2026-06-04")
  })

  it("timeOfDay renders 24h time in the target zone", () => {
    expect(timeOfDay(INSTANT, { timeZone: NY })).toBe("23:12:30")
    expect(timeOfDay(INSTANT, { timeZone: TOKYO })).toBe("12:12:30")
    expect(timeOfDay(INSTANT, { timeZone: "UTC" })).toBe("03:12:30")
  })

  it("timeOfDay renders midnight as 00:.. (never 24:..) in the target zone", () => {
    // 2026-06-04T04:00:00Z is 00:00:00 in New York (EDT, UTC-4).
    const midnightNY = "2026-06-04T04:00:00Z"
    expect(timeOfDay(midnightNY, { timeZone: NY })).toBe("00:00:00")
    expect(timeOfDay(midnightNY, { timeZone: NY }).startsWith("24:")).toBe(false)
  })

  it("shortDate renders 'Mon D' in the target zone", () => {
    expect(shortDate(INSTANT, { timeZone: NY })).toBe("Jun 3")
    expect(shortDate(INSTANT, { timeZone: TOKYO })).toBe("Jun 4")
  })

  it("absoluteDateTime joins date and 24h time with a middot", () => {
    expect(absoluteDateTime(INSTANT, { timeZone: NY })).toBe("Jun 3, 2026 · 23:12:30")
    expect(absoluteDateTime(INSTANT, { timeZone: TOKYO })).toBe("Jun 4, 2026 · 12:12:30")
  })

  it("calendarDate and clockTime differ across zones for a boundary instant", () => {
    expect(calendarDate(INSTANT, { timeZone: NY })).not.toBe(
      calendarDate(INSTANT, { timeZone: TOKYO }),
    )
    expect(clockTime(INSTANT, { timeZone: NY })).not.toBe(clockTime(INSTANT, { timeZone: TOKYO }))
  })

  it("falls back to UTC for an empty or unknown timeZone", () => {
    expect(dayKey(INSTANT, {})).toBe("2026-06-04") // empty -> UTC
    expect(dayKey(INSTANT, { timeZone: "Not/AZone" })).toBe("2026-06-04") // invalid -> UTC
  })

  it("hourOfDay returns the 0–23 hour in the target zone", () => {
    expect(hourOfDay(INSTANT, { timeZone: NY })).toBe(23)
    expect(hourOfDay(INSTANT, { timeZone: TOKYO })).toBe(12)
    expect(hourOfDay(INSTANT, { timeZone: "UTC" })).toBe(3)
  })

  it("hourOfDay accepts a Date instance and normalizes midnight to 0", () => {
    // 2026-06-04T04:00:00Z is midnight (00:00) in New York (UTC-4).
    expect(hourOfDay(new Date("2026-06-04T04:00:00Z"), { timeZone: NY })).toBe(0)
  })

  it("returns empty string / null for empty input", () => {
    expect(shortDate("", { timeZone: NY })).toBe("")
    expect(timeOfDay(null, { timeZone: NY })).toBe("")
    expect(absoluteDateTime(undefined, { timeZone: NY })).toBe("")
    expect(dayKey("", { timeZone: NY })).toBe("")
    expect(hourOfDay(null, { timeZone: NY })).toBeNull()
    expect(calendarDaysAgo("", { timeZone: NY })).toBeNull()
  })
})

describe("relativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-20T00:00:00Z"))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("keeps timezone-independent relative labels", () => {
    expect(relativeTime("2026-06-19T23:59:55Z", { timeZone: "Asia/Tokyo" })).toBe("Just now")
    expect(relativeTime("2026-06-19T23:55:00Z", { timeZone: "Asia/Tokyo" })).toBe("5m ago")
    expect(relativeTime("2026-06-19T20:00:00Z", { timeZone: "Asia/Tokyo" })).toBe("4h ago")
  })

  it("uses a tz-aware weekday for the 1–7 day branch", () => {
    // 2026-06-18T12:00Z is a Thursday in both zones.
    expect(relativeTime("2026-06-18T12:00:00Z", { timeZone: "UTC" })).toBe("Thu")
  })

  it("uses a tz-aware short date for the >7 day branch", () => {
    expect(relativeTime(INSTANT, { timeZone: NY })).toBe("Jun 3")
    expect(relativeTime(INSTANT, { timeZone: TOKYO })).toBe("Jun 4")
  })

  it("returns empty string for empty input", () => {
    expect(relativeTime(null)).toBe("")
  })
})

describe("calendarDaysAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 2026-06-20T02:00Z = 2026-06-19 22:00 in New York, 2026-06-20 11:00 in Tokyo.
    vi.setSystemTime(new Date("2026-06-20T02:00:00Z"))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("counts whole calendar days in the target zone", () => {
    // System time is 2026-06-20T02:00Z.
    // In NY (UTC-4) that is 2026-06-19 22:00 → today's key is "2026-06-19".
    // INSTANT in NY is 2026-06-03 → 2026-06-19 minus 2026-06-03 = 16 days.
    // In Tokyo (UTC+9) that is 2026-06-20 11:00 → today's key is "2026-06-20".
    // INSTANT in Tokyo is 2026-06-04 → 2026-06-20 minus 2026-06-04 = 16 days.
    expect(calendarDaysAgo(INSTANT, { timeZone: NY })).toBe(16)
    expect(calendarDaysAgo(INSTANT, { timeZone: TOKYO })).toBe(16)
  })

  it("returns 0 for an instant on today's calendar day", () => {
    expect(calendarDaysAgo("2026-06-20T01:00:00Z", { timeZone: TOKYO })).toBe(0)
  })
})
