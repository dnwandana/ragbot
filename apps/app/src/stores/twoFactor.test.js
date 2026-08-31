import { describe, it, expect, vi, beforeEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import * as api from "@/api/twoFactor"
import { useTwoFactorStore } from "./twoFactor"

vi.mock("@/api/twoFactor", () => ({ getStatus: vi.fn() }))

beforeEach(() => setActivePinia(createPinia()))

describe("twoFactor store", () => {
  it("fetchStatus reads res.data.data", async () => {
    api.getStatus.mockResolvedValue({
      data: { data: { enabled: true, enabled_at: "2026-06-26", backup_codes_remaining: 7 } },
    })
    const store = useTwoFactorStore()
    await store.fetchStatus()
    expect(store.status.enabled).toBe(true)
    expect(store.status.backupCodesRemaining).toBe(7)
  })

  it("reset clears status", () => {
    const store = useTwoFactorStore()
    store.status.enabled = true
    store.reset()
    expect(store.status.enabled).toBe(false)
  })
})
