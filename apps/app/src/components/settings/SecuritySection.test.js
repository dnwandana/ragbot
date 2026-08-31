// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import SecuritySection from "./SecuritySection.vue"
import * as twoFactorApi from "@/api/twoFactor"

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock("@/api/sessions", () => ({
  listSessions: vi.fn(async () => ({ data: { data: [] } })),
  revokeSession: vi.fn(async () => ({})),
  revokeOtherSessions: vi.fn(async () => ({})),
}))
vi.mock("@/api/twoFactor", () => ({
  getStatus: vi.fn(async () => ({
    data: { data: { enabled: false, backup_codes_remaining: 0 } },
  })),
  disable: vi.fn(async () => ({})),
  regenerateBackupCodes: vi.fn(async () => ({
    data: { data: { backup_codes: ["aaaa-1111", "bbbb-2222"] } },
  })),
}))

beforeEach(() => setActivePinia(createPinia()))

/**
 * Mounts SecuritySection with Ant Design components stubbed.
 *
 * @returns {import("@vue/test-utils").VueWrapper} The mounted wrapper.
 */
function mountSection() {
  return mount(SecuritySection, {
    global: {
      stubs: {
        "a-table": true,
        "a-modal": true,
        "a-input-password": true,
        "a-input": true,
        "a-popconfirm": true,
        TwoFactorSetupModal: true,
      },
    },
  })
}

describe("SecuritySection — 2FA", () => {
  it("shows the Two-factor authentication block", async () => {
    const wrapper = mountSection()
    await flushPromises()
    expect(wrapper.text()).toContain("Two-factor authentication")
  })

  it("confirmDisable passes the password and code to tf.disable", async () => {
    const wrapper = mountSection()
    await flushPromises()
    wrapper.vm.handleDisable()
    wrapper.vm.disablePassword = "pw"
    wrapper.vm.disableCode = "123456"
    await wrapper.vm.confirmDisable()
    await flushPromises()
    expect(twoFactorApi.disable).toHaveBeenCalledWith("pw", "123456")
  })
})

describe("SecuritySection — states", () => {
  it("off state shows the Set up action and Off badge", async () => {
    const wrapper = mountSection()
    await flushPromises()
    expect(wrapper.text()).toContain("Set up")
    expect(wrapper.find(".twofa-card .badge-off").text()).toBe("Off")
  })

  it("on state shows the backup-codes row with the remaining count", async () => {
    twoFactorApi.getStatus.mockResolvedValue({
      data: {
        data: { enabled: true, enabled_at: "2026-06-26T00:00:00Z", backup_codes_remaining: 7 },
      },
    })
    const wrapper = mountSection()
    await flushPromises()
    expect(wrapper.text()).toContain("Backup codes")
    expect(wrapper.text()).toContain("7 of 10 unused")
    expect(wrapper.text()).toContain("Regenerate")
  })

  it("confirmRegenerate passes password and code to the API and captures new codes", async () => {
    twoFactorApi.getStatus.mockResolvedValue({
      data: {
        data: { enabled: true, enabled_at: "2026-06-26T00:00:00Z", backup_codes_remaining: 7 },
      },
    })
    const wrapper = mountSection()
    await flushPromises()
    wrapper.vm.handleRegenerate()
    wrapper.vm.regenPassword = "pw"
    wrapper.vm.regenCode = "123456"
    await wrapper.vm.confirmRegenerate()
    await flushPromises()
    expect(twoFactorApi.regenerateBackupCodes).toHaveBeenCalledWith("pw", "123456")
    expect(wrapper.vm.newCodes).toEqual(["aaaa-1111", "bbbb-2222"])
  })
})
