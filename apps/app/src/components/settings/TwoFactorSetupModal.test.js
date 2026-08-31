// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import TwoFactorSetupModal from "./TwoFactorSetupModal.vue"

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn(async () => "data:image/png;base64,xx") },
}))
vi.mock("@/api/twoFactor", () => ({
  setup: vi.fn(async () => ({ data: { data: { otpauth_url: "otpauth://x", secret: "JBSW" } } })),
  activate: vi.fn(async () => ({ data: { data: { backup_codes: ["a", "b"] } } })),
  getStatus: vi.fn(async () => ({
    data: { data: { enabled: true, backup_codes_remaining: 10 } },
  })),
}))

beforeEach(() => setActivePinia(createPinia()))

/**
 * Mounts the setup modal with the shared stubs used across tests.
 *
 * @returns {import("@vue/test-utils").VueWrapper} The mounted wrapper.
 */
function mountModal() {
  return mount(TwoFactorSetupModal, {
    props: { open: true },
    global: {
      stubs: {
        "a-modal": { template: "<div><slot name='title' /><slot /></div>" },
        "a-input-password": true,
        OtpInput: true,
      },
    },
  })
}

describe("TwoFactorSetupModal", () => {
  it("renders step 1 (password) when opened", () => {
    const wrapper = mountModal()
    expect(wrapper.text()).toContain("Re-enter your password")
  })

  it("shows the step indicator for step 1", () => {
    const wrapper = mountModal()
    expect(wrapper.text()).toContain("Step 1 of 3")
  })

  it("renders the setup key and QR area on step 2", async () => {
    const wrapper = mountModal()
    wrapper.vm.tf.step.value = 2
    wrapper.vm.tf.secret.value = "JBSWY3DP"
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain("JBSWY3DP")
    expect(wrapper.text()).toContain("Step 2 of 3")
  })

  it("gates Done behind the saved-codes acknowledgement on step 3", async () => {
    const wrapper = mountModal()
    wrapper.vm.tf.step.value = 3
    wrapper.vm.tf.backupCodes.value = ["aaaa-1111", "bbbb-2222"]
    await wrapper.vm.$nextTick()
    const done = wrapper.findAll("button").find((b) => b.text() === "Done")
    expect(done.attributes("disabled")).toBeDefined()
    await wrapper.find("input[type=checkbox]").setValue(true)
    expect(done.attributes("disabled")).toBeUndefined()
  })
})
