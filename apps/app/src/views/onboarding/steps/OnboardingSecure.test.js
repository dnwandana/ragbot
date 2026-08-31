// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import OnboardingSecure from "./OnboardingSecure.vue"
import * as twoFactorApi from "@/api/twoFactor"

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn(async () => "data:image/png;base64,xx") },
}))
vi.mock("@/api/twoFactor", () => ({
  getStatus: vi.fn(async () => ({
    data: { data: { enabled: false, backup_codes_remaining: 0 } },
  })),
  setup: vi.fn(async () => ({
    data: { data: { otpauth_url: "otpauth://x", secret: "JBSWY3DP" } },
  })),
  activate: vi.fn(async () => ({ data: { data: { backup_codes: ["aaaa-1111", "bbbb-2222"] } } })),
}))

beforeEach(() => setActivePinia(createPinia()))

function mountStep() {
  const ctx = { back: vi.fn(), skip: vi.fn(), advance: vi.fn() }
  const wrapper = mount(OnboardingSecure, {
    props: { ctx },
    global: { stubs: { OtpInput: true } },
  })
  return { wrapper, ctx }
}

describe("OnboardingSecure", () => {
  it("starts on the password phase with the optional eyebrow", async () => {
    const { wrapper } = mountStep()
    await flushPromises()
    expect(wrapper.find(".ob-eyebrow").text()).toContain("Optional")
    expect(wrapper.find(".ob-title").text()).toBe("Secure your account")
    expect(wrapper.find("input[type=password]").exists()).toBe(true)
  })

  it("Skip for now calls ctx.skip", async () => {
    const { wrapper, ctx } = mountStep()
    await flushPromises()
    const skip = wrapper.findAll("button").find((b) => b.text() === "Skip for now")
    await skip.trigger("click")
    expect(ctx.skip).toHaveBeenCalled()
  })

  it("continue calls setup and reveals the QR phase with the setup key", async () => {
    const { wrapper } = mountStep()
    await flushPromises()
    await wrapper.find("input[type=password]").setValue("hunter22")
    const cont = wrapper.findAll("button").find((b) => b.text().includes("Continue"))
    await cont.trigger("click")
    await flushPromises()
    expect(twoFactorApi.setup).toHaveBeenCalledWith("hunter22")
    expect(wrapper.text()).toContain("JBSWY3DP")
  })

  it("after activation, acknowledging codes enables Continue which advances the wizard", async () => {
    const { wrapper, ctx } = mountStep()
    await flushPromises()
    wrapper.vm.tf.step.value = 3
    wrapper.vm.tf.backupCodes.value = ["aaaa-1111", "bbbb-2222"]
    await wrapper.vm.$nextTick()
    const cont = wrapper.findAll("button").find((b) => b.text().includes("Continue"))
    expect(cont.attributes("disabled")).toBeDefined()
    await wrapper.find("input[type=checkbox]").setValue(true)
    expect(cont.attributes("disabled")).toBeUndefined()
    await cont.trigger("click")
    expect(ctx.advance).toHaveBeenCalled()
  })
})
