import { request } from "@/utils/http"

/**
 * Changes the current user's password.
 *
 * @param {Object} data - Password change data (current_password, new_password).
 * @returns {Promise} Response confirming password change.
 */
export function changePassword(data) {
  return request.put("/auth/password", data)
}
