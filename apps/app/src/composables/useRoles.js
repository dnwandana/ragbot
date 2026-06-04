/**
 * Roles composable — drives the Roles settings panel: the list ↔ editor view state,
 * create/edit/view transitions, submit, and the delete-with-reassign flow.
 * Delegates all data operations to the roles store.
 */

import { ref, computed } from "vue"
import { useRolesStore } from "@/stores/roles"

export function useRoles() {
  const rolesStore = useRolesStore()

  // Panel view: { mode: "list" } | { mode: "create" } | { mode: "edit", role } | { mode: "view", role }
  const view = ref({ mode: "list" })

  // Role pending deletion (drives DeleteRoleModal), or null when the dialog is closed
  const deletingRole = ref(null)

  /** Switch the panel to the create editor (blank role). */
  function openCreate() {
    rolesStore.clearCurrentRole()
    view.value = { mode: "create" }
  }

  /**
   * Load a role's permissions and open the editable editor.
   * @param {string} workspaceId - Workspace UUID
   * @param {Object} role - Role list row to edit
   * @returns {Promise<void>}
   */
  async function openEdit(workspaceId, role) {
    await rolesStore.fetchRoleById(workspaceId, role.id)
    view.value = { mode: "edit", role }
  }

  /**
   * Load a role's permissions and open the read-only editor (system roles or no permission).
   * @param {string} workspaceId - Workspace UUID
   * @param {Object} role - Role list row to view
   * @returns {Promise<void>}
   */
  async function openView(workspaceId, role) {
    await rolesStore.fetchRoleById(workspaceId, role.id)
    view.value = { mode: "view", role }
  }

  /** Return to the role list. */
  function backToList() {
    view.value = { mode: "list" }
  }

  /**
   * Create or update a role based on the current view mode, returning to the list
   * only on success so a failed save keeps the editor open with the user's input.
   * @param {string} workspaceId - Workspace UUID
   * @param {Object} formData - { name, description, permission_ids }
   * @returns {Promise<void>}
   */
  async function handleSubmit(workspaceId, formData) {
    const result =
      view.value.mode === "edit"
        ? await rolesStore.updateRole(workspaceId, view.value.role.id, formData)
        : await rolesStore.createRole(workspaceId, formData)
    if (result) backToList()
  }

  /** Open the delete dialog for a role. */
  function openDelete(role) {
    deletingRole.value = role
  }

  /** Close the delete dialog. */
  function closeDelete() {
    deletingRole.value = null
  }

  /**
   * Confirm deletion, optionally reassigning members, then close the dialog
   * only on success so a failed delete keeps the dialog open.
   * @param {string} workspaceId - Workspace UUID
   * @param {string} [reassignToRoleId] - Role to move members to before deletion
   * @returns {Promise<void>}
   */
  async function confirmDelete(workspaceId, reassignToRoleId) {
    if (!deletingRole.value) return
    const result = await rolesStore.deleteRole(workspaceId, deletingRole.value.id, reassignToRoleId)
    if (result) closeDelete()
  }

  return {
    // Store state as computed
    roles: computed(() => rolesStore.roles),
    currentRole: computed(() => rolesStore.currentRole),
    allPermissions: computed(() => rolesStore.allPermissions),
    loading: computed(() => rolesStore.loading),
    // View + delete state
    view,
    deletingRole,
    // Delegated store fetches
    fetchRoles: rolesStore.fetchRoles,
    fetchAllPermissions: rolesStore.fetchAllPermissions,
    // Composable actions
    openCreate,
    openEdit,
    openView,
    backToList,
    handleSubmit,
    openDelete,
    closeDelete,
    confirmDelete,
  }
}
