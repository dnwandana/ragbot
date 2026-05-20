import { ref } from "vue"
import { defineStore } from "pinia"

/**
 * Pinia store holding transient chat-streaming state for the active
 * conversation: streaming flag, the in-progress assistant content, ReAct
 * thoughts/observations, and citation events received before the message is
 * persisted. Reset between sends.
 *
 * @returns {Object} Reactive refs (`isStreaming`, `currentContent`, `thoughts`, `observations`, `pendingCitations`, `error`) and the `reset` action.
 */
export const useChatStore = defineStore("chat", () => {
  const isStreaming = ref(false)
  const currentContent = ref("")
  const thoughts = ref([]) // { content, tool_call }[]
  const observations = ref([]) // { content, sources }[]
  const pendingCitations = ref([]) // citation events before message is complete
  const error = ref(null)

  /** Clear all streaming state back to defaults. */
  function reset() {
    isStreaming.value = false
    currentContent.value = ""
    thoughts.value = []
    observations.value = []
    pendingCitations.value = []
    error.value = null
  }

  return { isStreaming, currentContent, thoughts, observations, pendingCitations, error, reset }
})
