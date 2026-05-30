import { ref, computed } from "vue"
import { defineStore } from "pinia"
import * as datasetsApi from "@/api/datasets"

export const useDatasetsStore = defineStore("datasets", () => {
  const datasets = ref([])
  const currentDataset = ref(null)
  const pagination = ref(null)
  const loadingCount = ref(0)
  const loading = computed(() => loadingCount.value > 0)

  /**
   * Fetch datasets with optional search/sort/pagination params.
   * @param {string} workspaceId
   * @param {Object} [params]
   */
  async function fetchDatasets(workspaceId, params = {}) {
    loadingCount.value++
    try {
      const res = await datasetsApi.listDatasets(workspaceId, params)
      datasets.value = res.data.data
      pagination.value = res.data.pagination
    } finally {
      loadingCount.value--
    }
  }

  /**
   * Fetch a single dataset by ID.
   * @param {string} workspaceId
   * @param {string} id
   * @returns {Promise<Object>} The fetched dataset.
   */
  async function fetchDataset(workspaceId, id) {
    const res = await datasetsApi.getDataset(workspaceId, id)
    currentDataset.value = res.data.data
    return currentDataset.value
  }

  /**
   * Create a new dataset.
   * @param {string} workspaceId
   * @param {Object} data
   * @returns {Promise<Object>} Created dataset.
   */
  async function createDataset(workspaceId, data) {
    const res = await datasetsApi.createDataset(workspaceId, data)
    return res.data.data
  }

  /**
   * Update a dataset and set it as the current dataset.
   * @param {string} workspaceId
   * @param {string} id
   * @param {Object} data
   */
  async function updateDataset(workspaceId, id, data) {
    const res = await datasetsApi.updateDataset(workspaceId, id, data)
    currentDataset.value = res.data.data
  }

  /**
   * Delete a dataset and remove from the list.
   * @param {string} workspaceId
   * @param {string} id
   */
  async function deleteDataset(workspaceId, id) {
    await datasetsApi.deleteDataset(workspaceId, id)
    datasets.value = datasets.value.filter((d) => d.id !== id)
    if (currentDataset.value?.id === id) currentDataset.value = null
  }

  return {
    datasets,
    currentDataset,
    pagination,
    loading,
    fetchDatasets,
    fetchDataset,
    createDataset,
    updateDataset,
    deleteDataset,
  }
})
