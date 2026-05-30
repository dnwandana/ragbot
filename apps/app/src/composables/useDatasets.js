import { ref, computed, watch, onMounted, onUnmounted } from "vue"
import { message } from "ant-design-vue"
import { useDatasetsStore } from "@/stores/datasets"

/**
 * Composable for dataset CRUD with modal state, search, sort, and pagination.
 * @param {string} workspaceId
 * @returns {Object}
 */
export function useDatasets(workspaceId) {
  const store = useDatasetsStore()

  // Modal state
  const isModalVisible = ref(false)
  const editingDataset = ref(null)
  const nameRules = [{ required: true, message: "Name is required" }, { max: 255 }]

  // View state — owned here so watchers can read viewMode for limit computation
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
    return store.fetchDatasets(workspaceId, {
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

  // View mode change (cards↔table changes limit) — reset page, re-fetch
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

  function openCreateModal() {
    editingDataset.value = null
    isModalVisible.value = true
  }

  /** @param {{ id: string, name: string, description: string }} dataset */
  function openEditModal(dataset) {
    editingDataset.value = dataset
    isModalVisible.value = true
  }

  function closeModal() {
    isModalVisible.value = false
    editingDataset.value = null
  }

  /** @param {{ name: string, description: string }} formData */
  async function handleSubmit(formData) {
    if (editingDataset.value) {
      await store.updateDataset(workspaceId, editingDataset.value.id, formData)
      message.success("Dataset updated")
    } else {
      await store.createDataset(workspaceId, formData)
      message.success("Dataset created")
      page.value = 1
    }
    await doFetch()
    closeModal()
  }

  /** @param {string} id */
  async function handleDelete(id) {
    await store.deleteDataset(workspaceId, id)
    message.success("Dataset deleted")
    if (store.datasets.length === 0 && page.value > 1) page.value = 1
    await doFetch()
  }

  return {
    datasets: computed(() => store.datasets),
    loading: computed(() => store.loading),
    pagination: computed(() => store.pagination),
    viewMode,
    query,
    sortBy,
    sortOrder,
    page,
    setPage,
    isModalVisible,
    editingDataset,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    handleDelete,
    nameRules,
  }
}
