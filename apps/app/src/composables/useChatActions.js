import { ref, onBeforeUnmount } from "vue"

/**
 * Composable for chat message-level actions.
 * Handles client-side actions (copy, highlight) and provides stubs for future API-backed actions.
 *
 * @returns {{ highlightedSource: import('vue').Ref<{msgId: string, n: number}|null>, copiedId: import('vue').Ref<string|null>, copyMessage: (msg: Object) => Promise<void>, rateMessage: (msg: Object, rating: string|null) => void, setHighlight: (msgId: string|null, n: number|null) => void }}
 */
export function useChatActions() {
  const highlightedSource = ref(null)
  const copiedId = ref(null)
  const pendingTimers = new Set()

  onBeforeUnmount(() => pendingTimers.forEach(clearTimeout))

  /**
   * Copy message text to clipboard.
   *
   * @param {Object} msg - Message with a text property.
   * @returns {Promise<void>}
   */
  async function copyMessage(msg) {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(msg.text || "")
      }
      copiedId.value = msg.id
      const id = setTimeout(() => {
        copiedId.value = null
        pendingTimers.delete(id)
      }, 1300)
      pendingTimers.add(id)
    } catch {
      // Clipboard API not available
    }
  }

  /**
   * Rate a message (optimistic — no backend yet).
   *
   * @param {Object} msg - Message to rate.
   * @param {string|null} rating - "up", "down", or null to clear.
   */
  function rateMessage(_msg, _rating) {
    // TODO: Call API when endpoint exists
  }

  /**
   * Set the highlighted source citation.
   *
   * @param {string|null} msgId - Message ID.
   * @param {number|null} n - Citation number.
   */
  function setHighlight(msgId, n) {
    if (msgId == null || n == null) {
      highlightedSource.value = null
    } else {
      highlightedSource.value = { msgId, n }
      const id = setTimeout(() => {
        highlightedSource.value = null
        pendingTimers.delete(id)
      }, 2800)
      pendingTimers.add(id)
    }
  }

  return {
    highlightedSource,
    copiedId,
    copyMessage,
    rateMessage,
    setHighlight,
  }
}
