import { ref } from "vue"
import { defineStore } from "pinia"
import {
  getWorkspaces as apiGetWorkspaces,
  getWorkspace as apiGetWorkspace,
  createWorkspace as apiCreateWorkspace,
  updateWorkspace as apiUpdateWorkspace,
  deleteWorkspace as apiDeleteWorkspace,
} from "@/api/workspaces"

export const useWorkspacesStore = defineStore("workspaces", () => {
  const workspaces = ref([])
  const currentWorkspace = ref(null)
  const currentPermissions = ref([])
  const loading = ref(false)

  /**
   * Fetch all workspaces the authenticated user belongs to.
   * @returns {Promise<void>}
   */
  async function fetchWorkspaces() {
    loading.value = true
    try {
      const res = await apiGetWorkspaces()
      workspaces.value = res.data.data
    } catch {
      workspaces.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch a single workspace and set it as the current workspace.
   * @param {string} workspaceId - Workspace UUID
   * @returns {Promise<void>}
   */
  async function fetchWorkspaceById(workspaceId) {
    loading.value = true
    try {
      const res = await apiGetWorkspace(workspaceId)
      const data = res.data.data
      currentWorkspace.value = data
      currentPermissions.value = data.permissions ?? []
    } catch {
      currentWorkspace.value = null
      currentPermissions.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new workspace and refresh the workspace list.
   * @param {Object} data - Workspace data ({ name, settings? })
   * @returns {Promise<Object>} The created workspace
   */
  async function createWorkspace(data) {
    const res = await apiCreateWorkspace(data)
    await fetchWorkspaces()
    return res.data.data
  }

  /**
   * Update a workspace and refresh current workspace state.
   * @param {string} workspaceId - Workspace UUID
   * @param {Object} data - Fields to update
   * @returns {Promise<void>}
   */
  async function updateWorkspace(workspaceId, data) {
    const res = await apiUpdateWorkspace(workspaceId, data)
    currentWorkspace.value = res.data.data
    await fetchWorkspaces()
  }

  /**
   * Delete a workspace and refresh the workspace list.
   * Clears currentWorkspace if it matches the deleted ID.
   * @param {string} workspaceId - Workspace UUID
   * @returns {Promise<void>}
   */
  async function deleteWorkspace(workspaceId) {
    await apiDeleteWorkspace(workspaceId)
    await fetchWorkspaces()
    if (currentWorkspace.value?.id === workspaceId) {
      currentWorkspace.value = null
      currentPermissions.value = []
    }
  }

  /** Restore this store to its initial empty state (used on logout). */
  function reset() {
    workspaces.value = []
    currentWorkspace.value = null
    currentPermissions.value = []
    loading.value = false
  }

  return {
    workspaces,
    currentWorkspace,
    currentPermissions,
    loading,
    reset,
    fetchWorkspaces,
    fetchWorkspaceById,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
  }
})
