import { request } from "@/utils/http"

/**
 * Updates the current user's profile information.
 *
 * @param {Object} data - Profile data to update.
 * @returns {Promise} Response containing updated user data.
 */
export function updateProfile(data) {
  return request.put("/auth/profile", data)
}

/**
 * Deletes the current user's profile and account.
 *
 * @returns {Promise} Response confirming account deletion.
 */
export function deleteProfile() {
  return request.del("/auth/profile")
}
