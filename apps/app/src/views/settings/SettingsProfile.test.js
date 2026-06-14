// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { ref, computed } from "vue"
import { mount } from "@vue/test-utils"

vi.mock("@/stores/auth", () => ({
  useAuthStore: () => ({
    currentUser: computed(() => ({ full_name: "John Doe", timezone: "UTC" })),
  }),
}))

vi.mock("@/composables/useProfile", () => ({
  useProfile: () => ({ saving: ref(false), saveProfile: vi.fn() }),
}))

import SettingsProfile from "@/views/settings/SettingsProfile.vue"

// Stub the Ant Design Vue select primitives; the filter predicate is tested in
// isolation via the exposed `filterTimezone` binding.
const STUBS = {
  "a-input": true,
  "a-select": true,
  "a-select-opt-group": true,
  "a-select-option": true,
}

function mountView() {
  return mount(SettingsProfile, { global: { stubs: STUBS } })
}

describe("SettingsProfile timezone filter", () => {
  it("matches options whose value contains the input, case-insensitively", () => {
    const { filterTimezone } = mountView().vm
    expect(filterTimezone("london", { value: "Europe/London" })).toBe(true)
    expect(filterTimezone("TOKYO", { value: "Asia/Tokyo" })).toBe(true)
  })

  it("does not match options whose value omits the input", () => {
    const { filterTimezone } = mountView().vm
    expect(filterTimezone("london", { value: "Asia/Tokyo" })).toBe(false)
  })

  it("does not throw for opt-group nodes that have no value", () => {
    const { filterTimezone } = mountView().vm
    // Ant Design Vue runs the filter against group headers too; these carry a
    // `label`/`options` but no `value`. Regression guard for the crash that
    // broke timezone search entirely.
    expect(() => filterTimezone("london", { label: "Europe", options: [] })).not.toThrow()
    expect(filterTimezone("london", { label: "Europe", options: [] })).toBe(false)
  })
})
