import { ref } from "vue"
import { message } from "ant-design-vue"
import { useRouter } from "vue-router"
import { useAuthStore } from "@/stores/auth"
import { changePassword as apiChangePassword } from "@/api/account"
import { deleteProfile as apiDeleteProfile } from "@/api/profile"
import { clearUserData } from "@/utils/storage"

/**
 * Composable for account management (password changes and account deletion).
 *
 * @returns {Object} Account state and actions.
 * @returns {Ref<boolean>} changingPassword - Whether a password change is in progress.
 * @returns {Ref<boolean>} deletingAccount - Whether an account deletion is in progress.
 * @returns {Function} submitChangePassword - Changes the user's password.
 * @returns {Function} submitDeleteAccount - Deletes the user's account and clears local auth.
 */
export function useAccount() {
  const authStore = useAuthStore()
  const router = useRouter()
  const changingPassword = ref(false)
  const deletingAccount = ref(false)

  /**
   * Changes the user's password.
   *
   * @param {Object} data - Password change data (old_password, new_password, confirmation_password).
   * @returns {Promise<void>}
   */
  async function submitChangePassword(data) {
    changingPassword.value = true
    try {
      await apiChangePassword(data)
      message.success("Password updated. You've been signed out of other devices.")
    } finally {
      changingPassword.value = false
    }
  }

  /**
   * Deletes the user's account, clears local auth data, and redirects to login.
   *
   * @returns {Promise<void>}
   */
  async function submitDeleteAccount() {
    deletingAccount.value = true
    try {
      await apiDeleteProfile()
    } catch {
      // The HTTP client already surfaced the error toast (e.g. the sole-owner 409).
      // Swallow here so the rejection doesn't bubble out of the click handler as an
      // unhandled error. Scoped to the API call so post-success cleanup errors aren't
      // masked.
      return
    } finally {
      deletingAccount.value = false
    }

    authStore.user = null
    clearUserData()
    await router.push("/login")
  }

  return { changingPassword, deletingAccount, submitChangePassword, submitDeleteAccount }
}
