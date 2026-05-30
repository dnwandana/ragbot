import { ref, computed } from "vue"
import { defineStore } from "pinia"
import * as agentsApi from "@/api/agents"

export const useAgentsStore = defineStore("agents", () => {
  const agents = ref([])
  const pagination = ref(null)
  const loadingCount = ref(0)
  const loading = computed(() => loadingCount.value > 0)

  /**
   * Fetch agents with optional search/sort/pagination params.
   * @param {string} workspaceId
   * @param {Object} [params]
   */
  async function fetchAgents(workspaceId, params = {}) {
    loadingCount.value++
    try {
      const res = await agentsApi.listAgents(workspaceId, params)
      agents.value = res.data.data
      pagination.value = res.data.pagination
    } finally {
      loadingCount.value--
    }
  }

  /**
   * Create a new agent and prepend to the list.
   * @param {string} workspaceId
   * @param {Object} data
   * @returns {Promise<Object>} Created agent.
   */
  async function createAgent(workspaceId, data) {
    const res = await agentsApi.createAgent(workspaceId, data)
    agents.value = [res.data.data, ...agents.value]
    return res.data.data
  }

  /**
   * Update an agent in-place in the list.
   * @param {string} workspaceId
   * @param {string} id
   * @param {Object} data
   * @returns {Promise<Object>} Updated agent.
   */
  async function updateAgent(workspaceId, id, data) {
    const res = await agentsApi.updateAgent(workspaceId, id, data)
    const idx = agents.value.findIndex((a) => a.id === id)
    if (idx !== -1) agents.value[idx] = res.data.data
    return res.data.data
  }

  /**
   * Delete an agent and remove from the list.
   * @param {string} workspaceId
   * @param {string} id
   */
  async function deleteAgent(workspaceId, id) {
    await agentsApi.deleteAgent(workspaceId, id)
    agents.value = agents.value.filter((a) => a.id !== id)
  }

  return { agents, pagination, loading, fetchAgents, createAgent, updateAgent, deleteAgent }
})
