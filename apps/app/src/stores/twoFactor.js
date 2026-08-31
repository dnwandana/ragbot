import { defineStore } from "pinia"
import { ref } from "vue"
import * as api from "@/api/twoFactor"

const initialStatus = () => ({ enabled: false, enabledAt: null, backupCodesRemaining: 0 })

export const useTwoFactorStore = defineStore("twoFactor", () => {
  const status = ref(initialStatus())
  const loading = ref(false)

  /** Loads the caller's 2FA status. @returns {Promise<void>} */
  async function fetchStatus() {
    loading.value = true
    try {
      const res = await api.getStatus()
      const data = res.data.data
      status.value = {
        enabled: data.enabled,
        enabledAt: data.enabled_at,
        backupCodesRemaining: data.backup_codes_remaining,
      }
    } finally {
      loading.value = false
    }
  }

  /** Resets store state. */
  function reset() {
    status.value = initialStatus()
    loading.value = false
  }

  return { status, loading, fetchStatus, reset }
})
