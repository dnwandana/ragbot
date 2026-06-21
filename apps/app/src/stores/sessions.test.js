import { describe, it, expect, vi, beforeEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { useSessionsStore } from "@/stores/sessions"

vi.mock("@/api/sessions", () => ({
  listSessions: vi.fn().mockResolvedValue({
    data: {
      message: "OK",
      data: [
        { id: "s1", is_current: true },
        { id: "s2", is_current: false },
      ],
    },
  }),
  revokeSession: vi.fn().mockResolvedValue({}),
  revokeOtherSessions: vi.fn().mockResolvedValue({}),
}))

describe("useSessionsStore", () => {
  beforeEach(() => setActivePinia(createPinia()))

  it("fetchSessions unwraps the real http-client envelope and stores the sessions array", async () => {
    const store = useSessionsStore()
    await store.fetchSessions()
    expect(store.sessions).toEqual([
      { id: "s1", is_current: true },
      { id: "s2", is_current: false },
    ])
  })

  it("revokeSession removes the revoked session by id from state", async () => {
    const store = useSessionsStore()
    await store.fetchSessions()
    expect(store.sessions).toHaveLength(2)
    await store.revokeSession("s1")
    expect(store.sessions).toEqual([{ id: "s2", is_current: false }])
  })

  it("reset empties the sessions array", async () => {
    const store = useSessionsStore()
    await store.fetchSessions()
    expect(store.sessions).toHaveLength(2)
    store.reset()
    expect(store.sessions).toEqual([])
  })
})
