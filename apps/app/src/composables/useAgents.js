import { ref, computed, watch, onMounted, onUnmounted } from "vue"
import { message } from "ant-design-vue"
import { useAgentsStore } from "@/stores/agents"

/**
 * Composable for agent CRUD with drawer state, search, sort, and pagination.
 * @param {string} workspaceId
 */
export function useAgents(workspaceId) {
  const store = useAgentsStore()

  // Drawer state — track the edited agent by id and derive the live record from
  // the store so updates (e.g. default-toggle) reflect immediately without reopening.
  const isDrawerOpen = ref(false)
  const drawerAgentId = ref(null)
  const drawerAgent = computed(() => store.agents.find((a) => a.id === drawerAgentId.value) ?? null)
  const isEditing = computed(() => !!drawerAgent.value)

  // View state
  const viewMode = ref("cards")

  // Search / sort / page
  const query = ref("")
  const sortBy = ref("created_at")
  const sortOrder = ref("desc")
  const page = ref(1)

  function currentLimit() {
    return viewMode.value === "table" ? 15 : 12
  }

  function doFetch() {
    const trimmed = query.value.trim()
    return store.fetchAgents(workspaceId, {
      ...(trimmed && { search: trimmed }),
      sort_by: sortBy.value,
      sort_order: sortOrder.value,
      page: page.value,
      limit: currentLimit(),
    })
  }

  // Debounced search — resets to page 1 before firing
  let debounceTimer = null
  watch(query, () => {
    page.value = 1
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(doFetch, 300)
  })

  // Sort changes — immediate, reset page
  watch([sortBy, sortOrder], () => {
    page.value = 1
    doFetch()
  })

  // View mode change — reset page, re-fetch with new limit
  watch(viewMode, () => {
    page.value = 1
    doFetch()
  })

  /** @param {number} p */
  function setPage(p) {
    page.value = p
    doFetch()
  }

  onMounted(doFetch)
  onUnmounted(() => clearTimeout(debounceTimer))

  function openCreate() {
    drawerAgentId.value = null
    isDrawerOpen.value = true
  }

  /** @param {object} agent */
  function openEdit(agent) {
    drawerAgentId.value = agent.id
    isDrawerOpen.value = true
  }

  function closeDrawer() {
    isDrawerOpen.value = false
    drawerAgentId.value = null
  }

  /** @param {object} formData */
  async function handleSubmit(formData) {
    if (isEditing.value) {
      await store.updateAgent(workspaceId, drawerAgent.value.id, formData)
      message.success("Agent updated")
    } else {
      await store.createAgent(workspaceId, formData)
      message.success("Agent created")
      page.value = 1
    }
    await doFetch()
    closeDrawer()
  }

  /** @param {string} id */
  async function handleDelete(id) {
    await store.deleteAgent(workspaceId, id)
    message.success("Agent deleted")
    if (store.agents.length === 0 && page.value > 1) page.value = 1
    await doFetch()
  }

  /** @param {string} agentId */
  async function handleSetDefault(agentId) {
    await store.setDefaultAgent(workspaceId, agentId)
    message.success("Default agent updated")
  }

  return {
    agents: computed(() => store.agents),
    loading: computed(() => store.loading),
    pagination: computed(() => store.pagination),
    viewMode,
    query,
    sortBy,
    sortOrder,
    page,
    setPage,
    isDrawerOpen,
    drawerAgent,
    isEditing,
    openCreate,
    openEdit,
    closeDrawer,
    handleSubmit,
    handleDelete,
    handleSetDefault,
  }
}
