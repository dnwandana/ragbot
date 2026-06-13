import { computed } from "vue"
import { useAuthStore } from "@/stores/auth"
import * as time from "@/utils/time"

/**
 * Returns the shared date/time formatters pre-bound to the signed-in user's saved
 * timezone (falling back to UTC). The bound functions read a reactive `timeZone`,
 * so templates re-render when the user changes their timezone in settings.
 *
 * @returns {{
 *   timeZone: import("vue").ComputedRef<string>,
 *   relativeTime: (dateStr: string|null) => string,
 *   shortDate: (dateStr: string|null) => string,
 *   calendarDate: (dateStr: string|null) => string,
 *   clockTime: (dateStr: string|null) => string,
 *   absoluteDateTime: (dateStr: string|null) => string,
 *   timeOfDay: (dateStr: string|null) => string,
 *   hourOfDay: (date: string|Date|null) => number|null,
 *   dayKey: (dateStr: string|null) => string,
 *   calendarDaysAgo: (dateStr: string|null) => number|null,
 * }}
 */
export function useFormattedTime() {
  const authStore = useAuthStore()
  const timeZone = computed(() => authStore.currentUser?.timezone || "UTC")
  const bind = (fn) => (dateStr) => fn(dateStr, { timeZone: timeZone.value })
  return {
    timeZone,
    relativeTime: bind(time.relativeTime),
    shortDate: bind(time.shortDate),
    calendarDate: bind(time.calendarDate),
    clockTime: bind(time.clockTime),
    absoluteDateTime: bind(time.absoluteDateTime),
    timeOfDay: bind(time.timeOfDay),
    hourOfDay: bind(time.hourOfDay),
    dayKey: bind(time.dayKey),
    calendarDaysAgo: bind(time.calendarDaysAgo),
  }
}
