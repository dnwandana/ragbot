import { defineStore } from "pinia"
import { ref } from "vue"
import { message } from "ant-design-vue"
import {
  getRoles as apiGetRoles,
  getRole as apiGetRole,
  createRole as apiCreateRole,
  updateRole as apiUpdateRole,
  deleteRole as apiDeleteRole,
} from "@/api/roles"
import { getPermissions as apiGetPermissions } from "@/api/permissions"

export const useRolesStore = defineStore("roles", () => {
  const roles = ref([])
  const currentRole = ref(null)
  const allPermissions = ref([])
  const loading = ref(false)

  /**
   * Fetch all roles for a workspace (system + custom).
   * @param {string} workspaceId - Workspace UUID
   * @returns {Promise<Object>} API response data
   */
  async function fetchRoles(workspaceId) {
    loading.value = true
    try {
      const response = await apiGetRoles(workspaceId)
      roles.value = response.data.data
      return response.data
    } catch {
      roles.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch a single role by ID with its assigned permissions.
   * @param {string} workspaceId - Workspace UUID
   * @param {string} roleId - Role UUID
   * @returns {Promise<Object>} API response data
   */
  async function fetchRoleById(workspaceId, roleId) {
    loading.value = true
    try {
      const response = await apiGetRole(workspaceId, roleId)
      currentRole.value = response.data.data
      return response.data
    } catch {
      currentRole.value = null
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new custom role in a workspace.
   * @param {string} workspaceId - Workspace UUID
   * @param {Object} data - Role data
   * @returns {Promise<Object>} API response data
   */
  async function createRole(workspaceId, data) {
    loading.value = true
    try {
      const response = await apiCreateRole(workspaceId, data)
      message.success("Role created successfully!")
      await fetchRoles(workspaceId)
      return response.data
    } catch {
      // HTTP client handles error display
    } finally {
      loading.value = false
    }
  }

  /**
   * Update an existing role in a workspace.
   * @param {string} workspaceId - Workspace UUID
   * @param {string} roleId - Role UUID
   * @param {Object} data - Updated role data
   * @returns {Promise<Object>} API response data
   */
  async function updateRole(workspaceId, roleId, data) {
    loading.value = true
    try {
      const response = await apiUpdateRole(workspaceId, roleId, data)
      message.success("Role updated successfully!")
      await fetchRoles(workspaceId)
      return response.data
    } catch {
      // HTTP client handles error display
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a custom role from a workspace.
   * @param {string} workspaceId - Workspace UUID
   * @param {string} roleId - Role UUID
   * @returns {Promise<Object>} API response data
   */
  async function deleteRole(workspaceId, roleId) {
    loading.value = true
    try {
      const response = await apiDeleteRole(workspaceId, roleId)
      message.success("Role deleted successfully!")
      await fetchRoles(workspaceId)
      return response.data
    } catch {
      // HTTP client handles error display
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch all available permissions in the system.
   * @returns {Promise<Object>} API response data
   */
  async function fetchAllPermissions() {
    loading.value = true
    try {
      const response = await apiGetPermissions()
      allPermissions.value = response.data.data
      return response.data
    } catch {
      allPermissions.value = []
    } finally {
      loading.value = false
    }
  }

  /** Clear roles state when navigating away from workspace context. */
  function clearRoles() {
    roles.value = []
    currentRole.value = null
  }

  return {
    roles,
    currentRole,
    allPermissions,
    loading,
    fetchRoles,
    fetchRoleById,
    createRole,
    updateRole,
    deleteRole,
    fetchAllPermissions,
    clearRoles,
  }
})
