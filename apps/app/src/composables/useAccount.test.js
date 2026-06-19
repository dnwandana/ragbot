// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"

const { deleteProfile, clearUserData, push, authStore } = vi.hoisted(() => ({
  deleteProfile: vi.fn(),
  clearUserData: vi.fn(),
  push: vi.fn(),
  authStore: { user: {} },
}))
vi.mock("@/api/profile", () => ({ deleteProfile }))
vi.mock("@/api/account", () => ({ changePassword: vi.fn() }))
vi.mock("ant-design-vue", () => ({ message: { success: vi.fn(), error: vi.fn() } }))
vi.mock("vue-router", () => ({ useRouter: () => ({ push }) }))
vi.mock("@/stores/auth", () => ({ useAuthStore: () => authStore }))
vi.mock("@/utils/storage", () => ({ clearUserData }))

import { useAccount } from "@/composables/useAccount"

describe("useAccount.submitDeleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authStore.user = {}
  })

  it("does not reject and resets loading when deletion is blocked", async () => {
    deleteProfile.mockRejectedValue(new Error("sole owner"))
    const { submitDeleteAccount, deletingAccount } = useAccount()

    await expect(submitDeleteAccount()).resolves.toBeUndefined()
    expect(deletingAccount.value).toBe(false)
  })

  it("does not run cleanup when deletion is blocked", async () => {
    deleteProfile.mockRejectedValue(new Error("sole owner"))
    const { submitDeleteAccount } = useAccount()

    await submitDeleteAccount()

    expect(clearUserData).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it("clears auth state and redirects after a successful deletion", async () => {
    deleteProfile.mockResolvedValue(undefined)
    const { submitDeleteAccount, deletingAccount } = useAccount()

    await submitDeleteAccount()

    expect(authStore.user).toBeNull()
    expect(clearUserData).toHaveBeenCalledOnce()
    expect(push).toHaveBeenCalledWith("/login")
    expect(deletingAccount.value).toBe(false)
  })
})
