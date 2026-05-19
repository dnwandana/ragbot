import { ref, computed } from "vue"
import { message } from "ant-design-vue"
import { useAgentsStore } from "@/stores/agents"

/**
 * Composable for agent CRUD with modal state management.
 * @param {string} workspaceId - Current workspace ID.
 */
export function useAgents(workspaceId) {
  const store = useAgentsStore()
  const isModalVisible = ref(false)
  const editingAgent = ref(null)
  const isEditing = computed(() => !!editingAgent.value)

  function openCreateModal() {
    editingAgent.value = null
    isModalVisible.value = true
  }

  function openEditModal(agent) {
    editingAgent.value = agent
    isModalVisible.value = true
  }

  function closeModal() {
    isModalVisible.value = false
    editingAgent.value = null
  }

  async function handleSubmit(formData) {
    if (isEditing.value) {
      await store.updateAgent(workspaceId, editingAgent.value.id, formData)
      message.success("Agent updated")
    } else {
      await store.createAgent(workspaceId, formData)
      message.success("Agent created")
    }
    closeModal()
  }

  async function handleDelete(id) {
    await store.deleteAgent(workspaceId, id)
    message.success("Agent deleted")
  }

  return {
    agents: computed(() => store.agents),
    loading: computed(() => store.loading),
    isModalVisible,
    editingAgent,
    isEditing,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    handleDelete,
    fetchAgents: () => store.fetchAgents(workspaceId),
  }
}
