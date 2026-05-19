import { ref, computed } from "vue"
import { message } from "ant-design-vue"
import { useWorkspacesStore } from "@/stores/workspaces"

/**
 * Composable for workspace CRUD operations and modal state management.
 * @returns {Object} Workspace state, modal controls, and action handlers
 */
export function useWorkspaces() {
  const store = useWorkspacesStore()
  const isModalVisible = ref(false)
  const editingWorkspace = ref(null)
  const isEditing = computed(() => !!editingWorkspace.value)

  const nameRules = [
    { required: true, message: "Workspace name is required" },
    { max: 100, message: "Max 100 characters" },
  ]

  /** Open the create workspace modal. */
  function openCreateModal() {
    editingWorkspace.value = null
    isModalVisible.value = true
  }

  /**
   * Open the edit workspace modal with pre-filled data.
   * @param {Object} ws - Workspace object to edit
   */
  function openEditModal(ws) {
    editingWorkspace.value = ws
    isModalVisible.value = true
  }

  /** Close the workspace modal and reset editing state. */
  function closeModal() {
    isModalVisible.value = false
    editingWorkspace.value = null
  }

  /**
   * Handle create or update form submission.
   * @param {Object} formData - Submitted form data ({ name })
   * @returns {Promise<void>}
   */
  async function handleSubmit(formData) {
    if (isEditing.value) {
      await store.updateWorkspace(editingWorkspace.value.id, formData)
      message.success("Workspace updated")
    } else {
      await store.createWorkspace(formData)
      message.success("Workspace created")
    }
    closeModal()
  }

  /**
   * Handle workspace deletion.
   * @param {string} workspaceId - Workspace UUID to delete
   * @returns {Promise<void>}
   */
  async function handleDelete(workspaceId) {
    await store.deleteWorkspace(workspaceId)
    message.success("Workspace deleted")
  }

  return {
    workspaces: computed(() => store.workspaces),
    currentWorkspace: computed(() => store.currentWorkspace),
    loading: computed(() => store.loading),
    isModalVisible,
    editingWorkspace,
    isEditing,
    nameRules,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    handleDelete,
    fetchWorkspaces: store.fetchWorkspaces,
    fetchWorkspaceById: store.fetchWorkspaceById,
  }
}
