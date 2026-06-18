// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest"
import { setActivePinia, createPinia } from "pinia"

const { getWorkspaces } = vi.hoisted(() => ({ getWorkspaces: vi.fn() }))
vi.mock("@/api/workspaces", () => ({
  getWorkspaces,
  getWorkspace: vi.fn(),
  createWorkspace: vi.fn(),
  updateWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
}))

import { useWorkspacesStore } from "./workspaces.js"

describe("useWorkspacesStore.fetchWorkspaces", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it("returns true and populates workspaces on success", async () => {
    getWorkspaces.mockResolvedValue({ data: { data: [{ id: "ws1" }] } })
    const store = useWorkspacesStore()
    const ok = await store.fetchWorkspaces()
    expect(ok).toBe(true)
    expect(store.workspaces).toEqual([{ id: "ws1" }])
  })

  it("returns false and clears workspaces when the request fails", async () => {
    getWorkspaces.mockRejectedValue(new Error("network"))
    const store = useWorkspacesStore()
    store.workspaces = [{ id: "stale" }]
    const ok = await store.fetchWorkspaces()
    expect(ok).toBe(false)
    expect(store.workspaces).toEqual([])
  })
})
