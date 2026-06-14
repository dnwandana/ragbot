// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest"
import { setActivePinia, createPinia } from "pinia"

vi.mock("../api/auth.js", () => ({ logout: vi.fn().mockResolvedValue({}), getMe: vi.fn() }))
vi.mock("../utils/storage.js", () => ({
  getUserData: () => null,
  setUserData: vi.fn(),
  clearUserData: vi.fn(),
}))

import { useAuthStore } from "./auth.js"
import { useWorkspacesStore } from "./workspaces.js"
import { useConversationsStore } from "./conversations.js"
import { useChatStore } from "./chat.js"

describe("logout teardown", () => {
  beforeEach(() => setActivePinia(createPinia()))

  it("clears workspaces state on logout", async () => {
    const ws = useWorkspacesStore()
    ws.workspaces = [{ id: "w1" }]
    const auth = useAuthStore()
    await auth.logout()
    expect(ws.workspaces).toEqual([])
  })

  it("clears the auth store's own state on logout", async () => {
    const auth = useAuthStore()
    auth.user = { id: "u1", email: "a@b.com" }
    expect(auth.isAuthenticated).toBe(true)
    await auth.logout()
    expect(auth.user).toBeNull()
    expect(auth.isAuthenticated).toBeFalsy()
  })

  it("clears conversations state on logout", async () => {
    const conversations = useConversationsStore()
    conversations.conversations = [{ id: "c1" }]
    const auth = useAuthStore()
    await auth.logout()
    expect(conversations.conversations).toEqual([])
  })

  it("clears chat streaming state on logout", async () => {
    const chat = useChatStore()
    chat.currentContent = "secret"
    chat.thoughts = [{}]
    const auth = useAuthStore()
    await auth.logout()
    expect(chat.currentContent).toBe("")
    expect(chat.thoughts).toEqual([])
  })
})
