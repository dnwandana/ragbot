import { computed } from "vue"
import { useWorkspacesStore } from "@/stores/workspaces"

/**
 * Composable for checking the current user's workspace permissions.
 * Permissions are sourced from the workspaces store, populated when a workspace is fetched.
 */
export function usePermissions() {
  const workspacesStore = useWorkspacesStore()

  /**
   * Check if the current user has a specific permission.
   * @param {string} permission - Permission name (e.g., "members:write")
   * @returns {boolean}
   */
  function can(permission) {
    return workspacesStore.currentPermissions.includes(permission)
  }

  /**
   * Check if the current user has at least one of the given permissions.
   * @param {string[]} permissions - Array of permission names to check
   * @returns {boolean}
   */
  function canAny(permissions) {
    return permissions.some((p) => workspacesStore.currentPermissions.includes(p))
  }

  return {
    userPermissions: computed(() => workspacesStore.currentPermissions),
    can,
    canAny,
  }
}
