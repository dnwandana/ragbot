import { ref } from "vue"
import { defineStore } from "pinia"
import * as agentsApi from "@/api/agents"

export const useAgentsStore = defineStore("agents", () => {
  const agents = ref([])
  const loading = ref(false)

  /**
   * Fetch all agents for a workspace.
   * @param {string} workspaceId
   */
  async function fetchAgents(workspaceId) {
    loading.value = true
    try {
      const res = await agentsApi.listAgents(workspaceId)
      agents.value = res.data.data
    } finally {
      loading.value = false
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

  return { agents, loading, fetchAgents, createAgent, updateAgent, deleteAgent }
})
