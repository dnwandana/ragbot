import { ref, computed } from "vue"
import { defineStore } from "pinia"
import * as authApi from "../api/auth.js"
import { getUserData, setUserData, clearUserData, clearOnboardingData } from "../utils/storage.js"
import { resetAllStores } from "./reset.js"

export const useAuthStore = defineStore("auth", () => {
  const user = ref(getUserData())
  const loading = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const currentUser = computed(() => user.value)

  /**
   * Verifies the stored user session against the server.
   * Clears local data if the session is invalid.
   */
  async function initAuth() {
    if (!user.value) return
    try {
      const res = await authApi.getMe()
      user.value = res.data.data
      setUserData(user.value)
    } catch {
      user.value = null
      clearUserData()
    }
  }

  /**
   * Registers a new user account.
   *
   * @param {Object} params
   * @param {string} params.email - User's email address.
   * @param {string} params.password - Chosen password.
   * @param {string} params.confirmation_password - Password confirmation.
   * @param {string} params.full_name - User's full name.
   */
  async function signup({ email, password, confirmation_password, full_name }) {
    loading.value = true
    try {
      await authApi.signup({ email, password, confirmation_password, full_name })
    } finally {
      loading.value = false
    }
  }

  /**
   * Authenticates a user and stores their profile locally.
   *
   * When the server requires a second factor, no user/profile is persisted and
   * the caller is signalled to continue with the 2FA challenge.
   *
   * @param {string} email - User's email address.
   * @param {string} password - User's password.
   * @returns {Promise<{ mfaRequired: boolean }>} Whether a 2FA challenge is required.
   */
  async function signin(email, password) {
    loading.value = true
    try {
      const res = await authApi.signin(email, password)
      const data = res.data.data
      if (data?.mfa_required) {
        return { mfaRequired: true }
      }
      user.value = data
      setUserData(user.value)
      return { mfaRequired: false }
    } finally {
      loading.value = false
    }
  }

  /**
   * Persists a freshly authenticated user after a 2FA challenge completes.
   *
   * Mirrors the non-2FA signin path (which sets the user inline) so the route
   * guard sees an authenticated user and a page reload restores the session.
   *
   * @param {Object} profile - The authenticated user ({ id, email, full_name }).
   */
  function setAuthenticatedUser(profile) {
    user.value = profile
    setUserData(user.value)
  }

  /** Logs out the current user and clears local auth data. */
  async function logout() {
    user.value = null
    clearUserData()
    clearOnboardingData()
    resetAllStores()
    try {
      await authApi.logout()
    } catch {
      // local state already cleared; server-side token invalidation is best-effort
    }
  }

  /**
   * Sends a password-reset email for the given address.
   *
   * @param {string} email - The account email address.
   */
  async function forgotPassword(email) {
    loading.value = true
    try {
      await authApi.forgotPassword(email)
    } finally {
      loading.value = false
    }
  }

  /**
   * Resets the user's password using a token from the reset email.
   *
   * @param {Object} params
   * @param {string} params.token - Raw reset token from the email link.
   * @param {string} params.password - New password.
   * @param {string} params.confirmation_password - Must match `password`.
   */
  async function resetPassword({ token, password, confirmation_password }) {
    loading.value = true
    try {
      await authApi.resetPassword({ token, password, confirmation_password })
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    loading,
    isAuthenticated,
    currentUser,
    initAuth,
    signup,
    signin,
    setAuthenticatedUser,
    logout,
    forgotPassword,
    resetPassword,
  }
})
