import { defineStore } from "pinia"
import { ref } from "vue"
import * as sessionsApi from "@/api/sessions"

export const useSessionsStore = defineStore("sessions", () => {
  const sessions = ref([])
  const loading = ref(false)

  /** Fetches the active session list into state. */
  async function fetchSessions() {
    loading.value = true
    try {
      const res = await sessionsApi.listSessions()
      sessions.value = res.data.data ?? []
    } finally {
      loading.value = false
    }
  }

  /** Revokes one session and drops it from state. */
  async function revokeSession(id) {
    await sessionsApi.revokeSession(id)
    sessions.value = sessions.value.filter((session) => session.id !== id)
  }

  /** Revokes all other sessions, keeping only the current one in state. */
  async function revokeOthers() {
    await sessionsApi.revokeOtherSessions()
    sessions.value = sessions.value.filter((session) => session.is_current)
  }

  /** Restores initial state. */
  function reset() {
    sessions.value = []
    loading.value = false
  }

  return { sessions, loading, fetchSessions, revokeSession, revokeOthers, reset }
})
