import { ref, computed } from "vue"
import { message } from "ant-design-vue"
import { useWorkspacesStore } from "@/stores/workspaces"

/** Sort options for the workspaces table. */
export const SORT_OPTIONS = [
  { key: "updated_desc", label: "Recently updated" },
  { key: "name_asc", label: "Name A–Z" },
  { key: "created_desc", label: "Recently created" },
]

/**
 * Composable for workspace CRUD operations and modal state management.
 * @returns {Object} Workspace state, modal controls, and action handlers
 * @returns {import('vue').ComputedRef} returns.workspaces - All workspaces from the store
 * @returns {import('vue').Ref<string>} returns.query - Search/filter query string
 * @returns {import('vue').Ref<string>} returns.sortKey - Active sort key (e.g. "updated_desc")
 * @returns {Array} returns.SORT_OPTIONS - Available sort options for the workspaces table
 * @returns {import('vue').ComputedRef} returns.displayedWorkspaces - Filtered and sorted workspace list
 * @returns {import('vue').ComputedRef} returns.currentWorkspace - Currently active workspace
 * @returns {import('vue').ComputedRef} returns.loading - Whether a store action is in flight
 * @returns {import('vue').Ref<boolean>} returns.isModalVisible - Whether the create/edit modal is open
 * @returns {import('vue').Ref<Object|null>} returns.editingWorkspace - Workspace being edited, or null
 * @returns {import('vue').ComputedRef<boolean>} returns.isEditing - Whether the modal is in edit mode
 * @returns {Array} returns.nameRules - Ant Design form validation rules for the workspace name field
 * @returns {Function} returns.openCreateModal - Open the modal in create mode
 * @returns {Function} returns.openEditModal - Open the modal pre-filled for editing
 * @returns {Function} returns.closeModal - Close and reset the modal
 * @returns {Function} returns.handleSubmit - Handle create or update form submission
 * @returns {Function} returns.handleDelete - Handle workspace deletion
 * @returns {Function} returns.fetchWorkspaces - Fetch all workspaces from the API
 * @returns {Function} returns.fetchWorkspaceById - Fetch a single workspace by ID
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

  const query = ref("")
  const sortKey = ref("updated_desc")

  /** Client-side filtered + sorted workspaces for the table. */
  const displayedWorkspaces = computed(() => {
    const q = query.value.trim().toLowerCase()
    let list = store.workspaces
    if (q) {
      list = list.filter(
        (w) => w.name.toLowerCase().includes(q) || (w.description ?? "").toLowerCase().includes(q),
      )
    }
    const sorted = [...list]
    switch (sortKey.value) {
      case "name_asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "created_desc":
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        break
      default:
        sorted.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    }
    return sorted
  })

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
   * @param {Object} formData - Submitted form data ({ name, description })
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
    displayedWorkspaces,
    query,
    sortKey,
    SORT_OPTIONS,
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
