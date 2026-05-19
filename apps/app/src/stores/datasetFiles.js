import { ref } from "vue"
import { defineStore } from "pinia"
import * as filesApi from "@/api/datasetFiles"

export const useDatasetFilesStore = defineStore("datasetFiles", () => {
  const files = ref([])
  const pagination = ref(null)
  const loading = ref(false)

  async function fetchFiles(workspaceId, datasetId, params = {}) {
    loading.value = true
    try {
      const res = await filesApi.listFiles(workspaceId, datasetId, params)
      files.value = res.data.data
      pagination.value = res.data.pagination
    } finally {
      loading.value = false
    }
  }

  async function uploadFile(workspaceId, datasetId, file) {
    const form = new FormData()
    form.append("file", file)
    const res = await filesApi.uploadFile(workspaceId, datasetId, form)
    return res.data.data
  }

  async function scrapeUrl(workspaceId, datasetId, url) {
    const res = await filesApi.scrapeUrl(workspaceId, datasetId, url)
    return res.data.data
  }

  async function deleteFile(workspaceId, datasetId, id) {
    await filesApi.deleteFile(workspaceId, datasetId, id)
    files.value = files.value.filter((f) => f.id !== id)
  }

  async function reprocessFile(workspaceId, datasetId, id) {
    await filesApi.reprocessFile(workspaceId, datasetId, id)
  }

  return {
    files,
    pagination,
    loading,
    fetchFiles,
    uploadFile,
    scrapeUrl,
    deleteFile,
    reprocessFile,
  }
})
