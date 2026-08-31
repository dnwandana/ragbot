import { ref } from "vue"
import * as api from "@/api/twoFactor"
import { useTwoFactorStore } from "@/stores/twoFactor"
import { storeToRefs } from "pinia"

/**
 * Drives the 2FA enable wizard and status reads.
 *
 * @returns {Object} Wizard state and handlers.
 */
export function useTwoFactor() {
  const store = useTwoFactorStore()
  const { status, loading } = storeToRefs(store)

  const step = ref(1)
  const password = ref("")
  const otpauthUrl = ref("")
  const secret = ref("")
  const code = ref("")
  const backupCodes = ref([])
  const busy = ref(false)

  /** Resets wizard state to step 1. */
  function resetWizard() {
    step.value = 1
    password.value = ""
    otpauthUrl.value = ""
    secret.value = ""
    code.value = ""
    backupCodes.value = []
  }

  /** Step 1 → 2: re-auth + fetch pending secret. @returns {Promise<void>} */
  async function confirmPassword() {
    busy.value = true
    try {
      const res = await api.setup(password.value)
      otpauthUrl.value = res.data.data.otpauth_url
      secret.value = res.data.data.secret
      step.value = 2
    } finally {
      busy.value = false
    }
  }

  /** Step 2 → 3: verify code, capture backup codes. @returns {Promise<void>} */
  async function verifyCode() {
    busy.value = true
    try {
      const res = await api.activate(code.value)
      backupCodes.value = res.data.data.backup_codes
      step.value = 3
      await store.fetchStatus()
    } finally {
      busy.value = false
    }
  }

  /** Disables 2FA. @param {string} pw @param {string} code @returns {Promise<void>} */
  async function disable(pw, code) {
    busy.value = true
    try {
      await api.disable(pw, code)
      await store.fetchStatus()
    } finally {
      busy.value = false
    }
  }

  /** Regenerates backup codes. @param {string} pw @param {string} code @returns {Promise<string[]>} */
  async function regenerate(pw, code) {
    busy.value = true
    try {
      const res = await api.regenerateBackupCodes(pw, code)
      await store.fetchStatus()
      return res.data.data.backup_codes
    } finally {
      busy.value = false
    }
  }

  return {
    status,
    loading,
    step,
    password,
    otpauthUrl,
    secret,
    code,
    backupCodes,
    busy,
    resetWizard,
    confirmPassword,
    verifyCode,
    disable,
    regenerate,
    fetchStatus: store.fetchStatus,
  }
}
