import { ref, computed } from "vue"
import { message } from "ant-design-vue"
import { useDatasetFilesStore } from "@/stores/datasetFiles"

/**
 * @param {string} workspaceId
 * @param {string} datasetId
 * @returns {{ files: import("vue").ComputedRef, filteredFiles: import("vue").ComputedRef, loading: import("vue").ComputedRef, searchQuery: import("vue").Ref<string>, filterStatus: import("vue").Ref<string>, fetchFiles: Function, handleUpload: Function, handleScrape: Function, handleYouTube: Function, handleDelete: Function, handleReprocess: Function, handleRename: Function, bulkDelete: Function }}
 */
export function useDatasetFiles(workspaceId, datasetId) {
  const store = useDatasetFilesStore()

  const searchQuery = ref("")
  /** @type {import("vue").Ref<"all"|"indexed"|"parsing"|"failed">} */
  const filterStatus = ref("all")

  /**
   * Files filtered by search query and status chip.
   * "indexed" matches API status "completed".
   * "parsing" matches "processing" and "queued".
   */
  const filteredFiles = computed(() => {
    let result = store.files
    const q = searchQuery.value.trim().toLowerCase()
    if (q) {
      result = result.filter((f) => f.filename.toLowerCase().includes(q))
    }
    if (filterStatus.value === "indexed") {
      result = result.filter((f) => f.status === "completed")
    } else if (filterStatus.value === "parsing") {
      result = result.filter((f) => f.status === "processing" || f.status === "queued")
    } else if (filterStatus.value === "failed") {
      result = result.filter((f) => f.status === "failed")
    }
    return result
  })

  async function handleUpload(file) {
    await store.uploadFile(workspaceId, datasetId, file)
  }

  async function handleScrape(url) {
    await store.scrapeUrl(workspaceId, datasetId, url)
  }

  async function handleYouTube(url) {
    await store.addYouTube(workspaceId, datasetId, url)
  }

  async function handleDelete(id) {
    await store.deleteFile(workspaceId, datasetId, id)
    message.success("File deleted")
  }

  async function handleReprocess(id) {
    await store.reprocessFile(workspaceId, datasetId, id)
    message.success("Reprocessing started")
  }

  async function handleRename(id, filename) {
    await store.renameFile(workspaceId, datasetId, id, filename)
    message.success("File renamed")
  }

  /** @param {string[]} ids @returns {Promise<string[]>} failed IDs */
  async function bulkDelete(ids) {
    const failedIds = []
    for (const id of ids) {
      try {
        await store.deleteFile(workspaceId, datasetId, id)
      } catch {
        failedIds.push(id)
      }
    }
    const succeeded = ids.length - failedIds.length
    if (succeeded > 0) message.success(`${succeeded} file${succeeded > 1 ? "s" : ""} deleted`)
    if (failedIds.length > 0)
      message.error(`${failedIds.length} file${failedIds.length > 1 ? "s" : ""} failed to delete`)
    return failedIds
  }

  return {
    files: computed(() => store.files),
    filteredFiles,
    loading: computed(() => store.loading),
    searchQuery,
    filterStatus,
    fetchFiles: (params) => store.fetchFiles(workspaceId, datasetId, params),
    handleUpload,
    handleScrape,
    handleYouTube,
    handleDelete,
    handleReprocess,
    handleRename,
    bulkDelete,
  }
}
