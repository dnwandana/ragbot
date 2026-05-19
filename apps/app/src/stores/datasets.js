import { ref } from "vue"
import { defineStore } from "pinia"
import * as datasetsApi from "@/api/datasets"

export const useDatasetsStore = defineStore("datasets", () => {
  const datasets = ref([])
  const currentDataset = ref(null)
  const pagination = ref(null)
  const loading = ref(false)

  async function fetchDatasets(workspaceId, params = {}) {
    loading.value = true
    try {
      const res = await datasetsApi.listDatasets(workspaceId, params)
      datasets.value = res.data.data
      pagination.value = res.data.pagination
    } finally {
      loading.value = false
    }
  }

  async function fetchDataset(workspaceId, id) {
    const res = await datasetsApi.getDataset(workspaceId, id)
    currentDataset.value = res.data.data
    return currentDataset.value
  }

  async function createDataset(workspaceId, data) {
    const res = await datasetsApi.createDataset(workspaceId, data)
    return res.data.data
  }

  async function updateDataset(workspaceId, id, data) {
    const res = await datasetsApi.updateDataset(workspaceId, id, data)
    currentDataset.value = res.data.data
  }

  async function deleteDataset(workspaceId, id) {
    await datasetsApi.deleteDataset(workspaceId, id)
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
