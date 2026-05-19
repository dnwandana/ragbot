import { ref, computed } from "vue"
import { message } from "ant-design-vue"
import { useDatasetsStore } from "@/stores/datasets"

export function useDatasets(workspaceId) {
  const store = useDatasetsStore()
  const isModalVisible = ref(false)
  const editingDataset = ref(null)

  const nameRules = [{ required: true, message: "Name is required" }, { max: 255 }]

  function openCreateModal() {
    editingDataset.value = null
    isModalVisible.value = true
  }

  function closeModal() {
    isModalVisible.value = false
    editingDataset.value = null
  }

  async function handleSubmit(formData) {
    if (editingDataset.value) {
      await store.updateDataset(workspaceId, editingDataset.value.id, formData)
      message.success("Dataset updated")
    } else {
      await store.createDataset(workspaceId, formData)
      message.success("Dataset created")
    }
    await store.fetchDatasets(workspaceId)
    closeModal()
  }

  async function handleDelete(id) {
    await store.deleteDataset(workspaceId, id)
    await store.fetchDatasets(workspaceId)
    message.success("Dataset deleted")
  }

  return {
    datasets: computed(() => store.datasets),
    pagination: computed(() => store.pagination),
    loading: computed(() => store.loading),
    isModalVisible,
    editingDataset,
    openCreateModal,
    closeModal,
    handleSubmit,
    handleDelete,
    nameRules,
    fetchDatasets: (params) => store.fetchDatasets(workspaceId, params),
  }
}
