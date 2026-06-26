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

  async function addYouTube(workspaceId, datasetId, url) {
    const res = await filesApi.addYouTube(workspaceId, datasetId, url)
    return res.data.data
  }

  async function deleteFile(workspaceId, datasetId, id) {
    await filesApi.deleteFile(workspaceId, datasetId, id)
    files.value = files.value.filter((f) => f.id !== id)
  }

  async function reprocessFile(workspaceId, datasetId, id) {
    await filesApi.reprocessFile(workspaceId, datasetId, id)
  }

  /**
   * Rename a dataset file and patch it in local state.
   * Prefers the server-returned record, falling back to a filename-only patch.
   *
   * @param {string} workspaceId - Workspace UUID
   * @param {string} datasetId - Dataset UUID
   * @param {string} id - Dataset file UUID
   * @param {string} filename - New filename
   * @returns {Promise<object|undefined>} The updated file record written to local state, or `undefined` if the id isn't in local state
   */
  async function renameFile(workspaceId, datasetId, id, filename) {
    const res = await filesApi.updateFile(workspaceId, datasetId, id, { filename })
    const serverRecord = res.data.data
    let result
    files.value = files.value.map((f) => {
      if (f.id !== id) return f
      result = serverRecord ? { ...f, ...serverRecord } : { ...f, filename }
      return result
    })
    return result
  }

  /** Restore this store to its initial empty state (used on logout). */
  function reset() {
    files.value = []
    pagination.value = null
    loading.value = false
  }

  return {
    files,
    pagination,
    loading,
    reset,
    fetchFiles,
    uploadFile,
    scrapeUrl,
    addYouTube,
    deleteFile,
    reprocessFile,
    renameFile,
  }
})
