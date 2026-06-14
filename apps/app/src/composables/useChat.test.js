// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { flushPromises } from "@vue/test-utils"

vi.mock("@/api/chat", () => ({ sendMessage: vi.fn() }))
vi.mock("@/api/auth", () => ({ getMe: vi.fn().mockResolvedValue({}) }))

import * as chatApi from "@/api/chat"
import { useChat } from "@/composables/useChat"
import { useConversationsStore } from "@/stores/conversations"
import { useChatStore } from "@/stores/chat"

/** Build a ReadableStream that emits the given SSE frame strings, then closes. */
const sseStream = (frames) => {
  const chunks = frames.map((f) => new TextEncoder().encode(f))
  let i = 0
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(chunks[i++])
      else controller.close()
    },
  })
}

describe("useChat", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it("refreshes the conversation list after the stream completes", async () => {
    const store = useConversationsStore()
    const order = []
    const fetchConversation = vi.spyOn(store, "fetchConversation").mockImplementation(() => {
      order.push("fetchConversation")
      return Promise.resolve({})
    })
    const fetchConversations = vi.spyOn(store, "fetchConversations").mockImplementation(() => {
      order.push("fetchConversations")
      return Promise.resolve()
    })

    chatApi.sendMessage.mockResolvedValue({
      ok: true,
      body: sseStream(["event: done\ndata: {}\n\n"]),
    })

    const { sendMessage } = useChat("ws1", "conv1")
    await sendMessage("hello")
    await flushPromises()

    expect(fetchConversation).toHaveBeenCalledWith("ws1", "conv1")
    expect(fetchConversations).toHaveBeenCalledWith("ws1")
    expect(order[0]).toBe("fetchConversation")
    expect(order).toEqual(["fetchConversation", "fetchConversations"])
  })

  it("clears the streaming bubble and stays error-free even if the sidebar refresh fails", async () => {
    const store = useConversationsStore()
    vi.spyOn(store, "fetchConversation").mockResolvedValue({})
    vi.spyOn(store, "fetchConversations").mockRejectedValue(new Error("network"))
    const chatStore = useChatStore()

    chatApi.sendMessage.mockResolvedValue({
      ok: true,
      body: sseStream(['event: token\ndata: {"content":"hi"}\n\n', "event: done\ndata: {}\n\n"]),
    })

    const { sendMessage } = useChat("ws1", "conv1")
    await sendMessage("hello")
    await flushPromises()

    expect(chatStore.currentContent).toBe("")
    expect(chatStore.error).toBeFalsy()
  })

  it("skips malformed + stale-event frames without aborting the stream", async () => {
    const chatStore = useChatStore()

    chatApi.sendMessage.mockResolvedValue({
      ok: true,
      body: sseStream([
        // Malformed data for a token event — must be skipped, and the event must
        // not bleed into the following data-only (orphan) frame.
        "event: token\ndata: NOT_JSON\n\n",
        'data: {"content":"orphan"}\n\n',
        // A well-formed token still applies after the skipped frames.
        'event: token\ndata: {"content":"hi"}\n\n',
      ]),
    })

    const { sendMessage } = useChat("ws1", "conv1")
    await sendMessage("yo")
    await flushPromises()

    expect(chatStore.error).toBeFalsy()
    expect(chatStore.currentContent).toContain("hi")
    expect(chatStore.currentContent).not.toContain("orphan")
  })
})
