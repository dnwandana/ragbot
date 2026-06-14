import { unref } from "vue"
import { useConversationsStore } from "../stores/conversations.js"
import { useChatStore } from "../stores/chat.js"
import * as chatApi from "../api/chat.js"
import * as authApi from "../api/auth.js"

/**
 * Composable that drives an SSE chat exchange: optimistically appends the user
 * message, opens the stream, parses `event:`/`data:` SSE frames into the chat
 * store, and reloads the conversation when the stream completes.
 *
 * @param {string | import('vue').Ref<string>} workspaceId - Workspace UUID or ref.
 * @param {string | import('vue').Ref<string>} conversationId - Conversation UUID or ref.
 * @returns {{ sendMessage: (content: string) => Promise<void>, abort: () => void }}
 */
export function useChat(workspaceId, conversationId) {
  const chatStore = useChatStore()
  const conversationsStore = useConversationsStore()
  let abortController = null

  /**
   * Send a message and stream the assistant response into the chat store.
   * No-ops while a stream is already in progress.
   *
   * @param {string} content - The user's message text.
   * @returns {Promise<void>}
   */
  async function sendMessage(content) {
    if (chatStore.isStreaming) return

    chatStore.reset()
    chatStore.isStreaming = true

    // Optimistically add user message to the conversation
    const conv = conversationsStore.currentConversation
    if (conv) {
      conv.messages = conv.messages || []
      conv.messages.push({
        id: `optimistic-${Date.now()}`,
        role: "user",
        step_type: "input",
        content,
        created_at: new Date().toISOString(),
      })
    }

    abortController = new AbortController()

    try {
      // Route a request through the custom HTTP client first so a stale access
      // token triggers the 401-refresh flow (and new cookies) before the raw
      // fetch SSE stream opens — raw fetch bypasses that client's refresh logic.
      await authApi.getMe()

      const response = await chatApi.sendMessage(
        unref(workspaceId),
        unref(conversationId),
        content,
        abortController.signal,
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let currentEvent = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split("\n")
        buffer = lines.pop()

        for (const line of lines) {
          if (line.startsWith(":")) continue
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith("data: ")) {
            let data
            try {
              data = JSON.parse(line.slice(6))
            } catch {
              currentEvent = null
              // Malformed, partial, or keepalive frame — skip it rather than aborting the stream.
              continue
            }

            if (currentEvent === "token") {
              chatStore.currentContent += data.content
            } else if (currentEvent === "thought") {
              chatStore.thoughts.push(data)
            } else if (currentEvent === "observation") {
              chatStore.observations.push(data)
            } else if (currentEvent === "citation") {
              chatStore.pendingCitations.push(data)
            } else if (currentEvent === "done") {
              // Reload the conversation to pull in the persisted messages, then
              // drop the streaming bubble immediately so the answer is never
              // shown twice (persisted message + leftover streaming bubble).
              await conversationsStore.fetchConversation(unref(workspaceId), unref(conversationId))
              chatStore.currentContent = ""
              // Refresh the sidebar so a newly-created (now auto-titled)
              // conversation appears and reorders to the top. Cosmetic and
              // result-less: fire-and-forget (do NOT await — awaiting prolongs
              // isStreaming and blocks the read loop) and swallow failure so a
              // stale sidebar never surfaces as a chat error.
              conversationsStore.fetchConversations(unref(workspaceId)).catch(() => {})
            } else if (currentEvent === "error") {
              chatStore.error = data.message
            }

            currentEvent = null
          }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        chatStore.error = err.message
      }
    } finally {
      chatStore.isStreaming = false
      abortController = null
    }
  }

  /** Abort the in-flight stream and clear the streaming flag. */
  function abort() {
    abortController?.abort()
    chatStore.isStreaming = false
  }

  // TODO: edit/regenerate require server-side message deletion — implement when
  // DELETE /messages endpoint exists.
  return { sendMessage, abort }
}
