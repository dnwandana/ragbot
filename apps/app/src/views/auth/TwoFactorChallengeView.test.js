// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"
import { setActivePinia, createPinia } from "pinia"
import TwoFactorChallengeView from "./TwoFactorChallengeView.vue"
import { useAuthStore } from "@/stores/auth"

const push = vi.fn()
vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useRouter: () => ({ push }),
}))
vi.mock("@/api/twoFactor", () => ({
  verifySignin: vi.fn(async () => ({ data: { data: { id: "u1", email: "j@d.com" } } })),
  requestEmailCode: vi.fn(async () => ({})),
}))
const errorToast = vi.hoisted(() => vi.fn())
vi.mock("ant-design-vue", async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, message: { ...actual.message, error: errorToast } }
})

const STUBS = { AuthShell: { template: "<div><slot /></div>" }, OtpInput: true }

describe("TwoFactorChallengeView", () => {
  let pinia
  beforeEach(() => {
    push.mockClear()
    errorToast.mockClear()
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it("verifies a completed code and routes to workspaces", async () => {
    const { verifySignin } = await import("@/api/twoFactor")
    const wrapper = mount(TwoFactorChallengeView, {
      global: { plugins: [pinia], stubs: STUBS },
    })
    await wrapper.vm.submit("481947")
    await flushPromises()
    expect(verifySignin).toHaveBeenCalledWith({ method: "totp", code: "481947" })
    expect(push).toHaveBeenCalledWith("/workspaces")
  })

  it("populates the auth store so the route guard treats the user as authenticated", async () => {
    const wrapper = mount(TwoFactorChallengeView, {
      global: { plugins: [pinia], stubs: STUBS },
    })
    await wrapper.vm.submit("481947")
    await flushPromises()
    const auth = useAuthStore()
    expect(auth.user).toEqual({ id: "u1", email: "j@d.com" })
    expect(auth.isAuthenticated).toBe(true)
  })

  it("renders mode-specific headings and switch links", async () => {
    const wrapper = mount(TwoFactorChallengeView, {
      global: { plugins: [pinia], stubs: STUBS },
    })
    expect(wrapper.find("h1").text()).toBe("Enter your code")
    await wrapper.vm.switchMode("backup")
    await flushPromises()
    expect(wrapper.find("h1").text()).toBe("Enter a backup code")
    expect(wrapper.find("input.backup-input").exists()).toBe(true)
  })

  it("requests an email code and starts the resend cooldown on email mode", async () => {
    const { requestEmailCode } = await import("@/api/twoFactor")
    const wrapper = mount(TwoFactorChallengeView, {
      global: { plugins: [pinia], stubs: STUBS },
    })
    await wrapper.vm.switchMode("email")
    await flushPromises()
    expect(requestEmailCode).toHaveBeenCalled()
    expect(wrapper.vm.resendCooldown).toBeGreaterThan(0)
    expect(wrapper.find("h1").text()).toBe("Check your email")
  })

  it("shows the server error and clears the code when verification fails", async () => {
    const { verifySignin } = await import("@/api/twoFactor")
    verifySignin.mockRejectedValueOnce({
      status: 401,
      response: { data: { message: "Invalid verification code" } },
    })
    const wrapper = mount(TwoFactorChallengeView, { global: { plugins: [pinia], stubs: STUBS } })
    await wrapper.vm.submit("000000")
    await flushPromises()
    expect(errorToast).toHaveBeenCalledWith("Invalid verification code")
    expect(push).not.toHaveBeenCalled()
  })

  it("routes back to /login when the challenge is gone", async () => {
    const { verifySignin } = await import("@/api/twoFactor")
    verifySignin.mockRejectedValueOnce({
      status: 401,
      response: { data: { message: "Too many attempts. Please sign in again." } },
    })
    const wrapper = mount(TwoFactorChallengeView, { global: { plugins: [pinia], stubs: STUBS } })
    await wrapper.vm.submit("000000")
    await flushPromises()
    expect(errorToast).toHaveBeenCalledWith("Too many attempts. Please sign in again.")
    expect(push).toHaveBeenCalledWith("/login")
  })

  it("surfaces a failed email-code request", async () => {
    const { requestEmailCode } = await import("@/api/twoFactor")
    requestEmailCode.mockRejectedValueOnce({
      status: 401,
      response: { data: { message: "Token expired" } },
    })
    const wrapper = mount(TwoFactorChallengeView, { global: { plugins: [pinia], stubs: STUBS } })
    await wrapper.vm.switchMode("email")
    await flushPromises()
    expect(errorToast).toHaveBeenCalledWith("Token expired")
    expect(push).toHaveBeenCalledWith("/login")
  })
})
