// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest"
import { mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import { useFormattedTime } from "@/composables/useFormattedTime"
import { useAuthStore } from "@/stores/auth"

const INSTANT = "2026-06-04T03:12:30Z" // Jun 3 in New York, Jun 4 in Tokyo

/** Mount a throwaway host so the composable runs inside a component setup. */
function withFormattedTime(pinia) {
  let api
  mount(
    {
      setup() {
        api = useFormattedTime()
        return () => null
      },
    },
    { global: { plugins: [pinia] } },
  )
  return api
}

describe("useFormattedTime", () => {
  let pinia
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it("formats using the user's saved timezone", () => {
    // INSTANT is "Jun 4" in UTC, so Tokyo (also Jun 4) wouldn't prove the zone is
    // applied. New York (Jun 3) differs from the UTC fallback, so it does.
    useAuthStore().user = { timezone: "America/New_York" }
    const { shortDate } = withFormattedTime(pinia)
    expect(shortDate(INSTANT)).toBe("Jun 3")
  })

  it("falls back to UTC when no user/timezone is set", () => {
    useAuthStore().user = null
    const { shortDate } = withFormattedTime(pinia)
    expect(shortDate(INSTANT)).toBe("Jun 4") // UTC
  })

  it("reactively reflects a timezone change", () => {
    const store = useAuthStore()
    store.user = { timezone: "Asia/Tokyo" }
    const { shortDate } = withFormattedTime(pinia)
    expect(shortDate(INSTANT)).toBe("Jun 4")
    store.user = { timezone: "America/New_York" }
    expect(shortDate(INSTANT)).toBe("Jun 3")
  })
})
