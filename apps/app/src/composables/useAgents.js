import { ref, computed } from "vue"
import { message } from "ant-design-vue"
import { useAgentsStore } from "@/stores/agents"

/**
 * Composable for agent CRUD with drawer state management.
 * @param {string} workspaceId - Current workspace ID.
 */
export function useAgents(workspaceId) {
  const store = useAgentsStore()
  const isDrawerOpen = ref(false)
  const drawerAgent = ref(null)
  const isEditing = computed(() => !!drawerAgent.value)

  function openCreate() {
    drawerAgent.value = null
    isDrawerOpen.value = true
  }

  function openEdit(agent) {
    drawerAgent.value = agent
    isDrawerOpen.value = true
  }

  function closeDrawer() {
    isDrawerOpen.value = false
    drawerAgent.value = null
  }

  async function handleSubmit(formData) {
    if (isEditing.value) {
      await store.updateAgent(workspaceId, drawerAgent.value.id, formData)
      message.success("Agent updated")
    } else {
      await store.createAgent(workspaceId, formData)
      message.success("Agent created")
    }
    closeDrawer()
  }

  async function handleDelete(id) {
    await store.deleteAgent(workspaceId, id)
    message.success("Agent deleted")
  }

  return {
    agents: computed(() => store.agents),
    loading: computed(() => store.loading),
    isDrawerOpen,
    drawerAgent,
    isEditing,
    openCreate,
    openEdit,
    closeDrawer,
    handleSubmit,
    handleDelete,
    fetchAgents: () => store.fetchAgents(workspaceId),
  }
}
