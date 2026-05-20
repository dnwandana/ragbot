import { ref, computed } from "vue"
import { useRouter } from "vue-router"
import { message } from "ant-design-vue"
import { useConversationsStore } from "@/stores/conversations"

/**
 * Composable for conversation CRUD with modal state management.
 * @param {string} workspaceId - Current workspace ID.
 */
export function useConversations(workspaceId) {
  const store = useConversationsStore()
  const router = useRouter()
  const isModalVisible = ref(false)

  function openCreateModal() {
    isModalVisible.value = true
  }

  function closeModal() {
    isModalVisible.value = false
  }

  async function handleCreate(formData) {
    try {
      const conv = await store.createConversation(workspaceId, formData)
      closeModal()
      router.push(`/workspaces/${workspaceId}/conversations/${conv.id}`)
    } catch {
      // HTTP client shows error toast
    }
  }

  async function handleDelete(id) {
    try {
      await store.deleteConversation(workspaceId, id)
      message.success("Conversation deleted")
    } catch {
      // HTTP client shows error toast
    }
  }

  return {
    conversations: computed(() => store.conversations),
    pagination: computed(() => store.pagination),
    loading: computed(() => store.loading),
    isModalVisible,
    openCreateModal,
    closeModal,
    handleCreate,
    handleDelete,
    fetchConversations: (params) => store.fetchConversations(workspaceId, params),
  }
}
