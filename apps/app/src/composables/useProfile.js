import { ref } from "vue"
import { message } from "ant-design-vue"
import { useAuthStore } from "@/stores/auth"
import { updateProfile as apiUpdateProfile } from "@/api/profile"
import { setUserData } from "@/utils/storage"

/**
 * Composable for profile management.
 *
 * @returns {Object} Profile state and actions.
 * @returns {Ref<boolean>} saving - Whether a profile update is in progress.
 * @returns {Function} saveProfile - Updates the user's profile.
 */
export function useProfile() {
  const authStore = useAuthStore()
  const saving = ref(false)

  /**
   * Updates the user's profile data.
   *
   * @param {Object} data - Profile fields to update.
   * @returns {Promise<boolean>} True if update succeeded.
   */
  async function saveProfile(data) {
    saving.value = true
    try {
      const res = await apiUpdateProfile(data)
      authStore.user = res.data.data
      setUserData(res.data.data)
      message.success("Profile updated.")
      return true
    } catch (err) {
      console.error("[useProfile] saveProfile failed:", err)
      return false
    } finally {
      saving.value = false
    }
  }

  return { saving, saveProfile }
}
