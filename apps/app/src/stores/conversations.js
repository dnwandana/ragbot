import { ref } from "vue"
import { defineStore } from "pinia"
import * as conversationsApi from "@/api/conversations"

export const useConversationsStore = defineStore("conversations", () => {
  const conversations = ref([])
  const currentConversation = ref(null)
  const pagination = ref(null)
  const loading = ref(false)

  /**
   * Fetch conversations for a workspace.
   * @param {string} workspaceId
   * @param {Object} [params] - Pagination/search query params.
   */
  async function fetchConversations(workspaceId, params = {}) {
    loading.value = true
    try {
      const res = await conversationsApi.listConversations(workspaceId, params)
      conversations.value = res.data.data
      pagination.value = res.data.pagination
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch a single conversation and set as current.
   * @param {string} workspaceId
   * @param {string} id - Conversation UUID.
   * @returns {Promise<Object>} Conversation data.
   */
  async function fetchConversation(workspaceId, id) {
    const res = await conversationsApi.getConversation(workspaceId, id)
    currentConversation.value = res.data.data
    return currentConversation.value
  }

  /**
   * Create a new conversation.
   * @param {string} workspaceId
   * @param {Object} data
   * @returns {Promise<Object>} Created conversation.
   */
  async function createConversation(workspaceId, data) {
    const res = await conversationsApi.createConversation(workspaceId, data)
    return res.data.data
  }

  /**
   * Update a conversation and sync currentConversation if it matches.
   * @param {string} workspaceId
   * @param {string} id
   * @param {Object} data
   * @returns {Promise<Object>} Updated conversation.
   */
  async function updateConversation(workspaceId, id, data) {
    const res = await conversationsApi.updateConversation(workspaceId, id, data)
    if (currentConversation.value?.id === id) {
      currentConversation.value = { ...currentConversation.value, ...res.data.data }
    }
    return res.data.data
  }

  /**
   * Delete a conversation and remove from the list.
   * @param {string} workspaceId
   * @param {string} id
   */
  async function deleteConversation(workspaceId, id) {
    await conversationsApi.deleteConversation(workspaceId, id)
    conversations.value = conversations.value.filter((c) => c.id !== id)
  }

  return {
    conversations,
    currentConversation,
    pagination,
    loading,
    fetchConversations,
    fetchConversation,
    createConversation,
    updateConversation,
    deleteConversation,
  }
})
