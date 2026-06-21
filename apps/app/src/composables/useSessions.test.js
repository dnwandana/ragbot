import { describe, it, expect, vi, beforeEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { useSessions } from "@/composables/useSessions"
import { useSessionsStore } from "@/stores/sessions"

vi.mock("@/api/sessions", () => ({
  listSessions: vi.fn().mockResolvedValue({ data: [] }),
  revokeSession: vi.fn().mockResolvedValue({}),
  revokeOtherSessions: vi.fn().mockResolvedValue({ data: { revoked: 0 } }),
}))

describe("useSessions", () => {
  beforeEach(() => setActivePinia(createPinia()))

  it("confirmRevoke delegates to the store and clears revokingId", async () => {
    const store = useSessionsStore()
    const spy = vi.spyOn(store, "revokeSession").mockResolvedValue()
    const { confirmRevoke, revokingId } = useSessions()

    await confirmRevoke("s1")
    expect(spy).toHaveBeenCalledWith("s1")
    expect(revokingId.value).toBeNull()
  })

  it("openRevokeAll / closeRevokeAll toggle the modal flag", () => {
    const { showRevokeAll, openRevokeAll, closeRevokeAll } = useSessions()
    openRevokeAll()
    expect(showRevokeAll.value).toBe(true)
    closeRevokeAll()
    expect(showRevokeAll.value).toBe(false)
  })
})
