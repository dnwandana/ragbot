import { ref, computed } from "vue"
import { storeToRefs } from "pinia"
import { useSessionsStore } from "@/stores/sessions"

/**
 * UI state + actions for the Active-sessions table: fetching, single revoke
 * (with per-row pending state), and the "log out all others" modal.
 *
 * @returns {Object} Reactive session list state and action handlers.
 */
export function useSessions() {
  const store = useSessionsStore()
  const { sessions, loading } = storeToRefs(store)

  const revokingId = ref(null)
  const showRevokeAll = ref(false)
  const revokingAll = ref(false)

  const hasOtherSessions = computed(() => sessions.value.some((session) => !session.is_current))

  /** Loads the session list. */
  function fetchSessions() {
    return store.fetchSessions()
  }

  /** Revokes a single session, tracking the pending row. */
  async function confirmRevoke(id) {
    revokingId.value = id
    try {
      await store.revokeSession(id)
    } finally {
      revokingId.value = null
    }
  }

  /** Opens the "log out all others" confirmation modal. */
  function openRevokeAll() {
    showRevokeAll.value = true
  }

  /** Closes the modal. */
  function closeRevokeAll() {
    showRevokeAll.value = false
  }

  /** Confirms revoke-all-others, then closes the modal. */
  async function confirmRevokeAll() {
    revokingAll.value = true
    try {
      await store.revokeOthers()
      showRevokeAll.value = false
    } finally {
      revokingAll.value = false
    }
  }

  return {
    sessions,
    loading,
    hasOtherSessions,
    revokingId,
    showRevokeAll,
    revokingAll,
    fetchSessions,
    confirmRevoke,
    openRevokeAll,
    closeRevokeAll,
    confirmRevokeAll,
  }
}
