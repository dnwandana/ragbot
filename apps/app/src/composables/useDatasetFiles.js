import { ref, computed } from "vue"
import { message } from "ant-design-vue"
import { useDatasetFilesStore } from "@/stores/datasetFiles"

export function useDatasetFiles(workspaceId, datasetId) {
  const store = useDatasetFilesStore()
  const isUploadVisible = ref(false)
  const isScrapeVisible = ref(false)

  async function handleUpload(file) {
    await store.uploadFile(workspaceId, datasetId, file)
    await store.fetchFiles(workspaceId, datasetId)
    isUploadVisible.value = false
    message.success("File uploaded — processing started")
    return false // prevent ant-design-vue auto upload
  }

  async function handleScrape(url) {
    await store.scrapeUrl(workspaceId, datasetId, url)
    await store.fetchFiles(workspaceId, datasetId)
    isScrapeVisible.value = false
    message.success("Scraping started")
  }

  async function handleDelete(id) {
    await store.deleteFile(workspaceId, datasetId, id)
    message.success("File deleted")
  }

  async function handleReprocess(id) {
    await store.reprocessFile(workspaceId, datasetId, id)
    message.success("Reprocessing started")
  }

  return {
    files: computed(() => store.files),
    pagination: computed(() => store.pagination),
    loading: computed(() => store.loading),
    isUploadVisible,
    isScrapeVisible,
    fetchFiles: (params) => store.fetchFiles(workspaceId, datasetId, params),
    handleUpload,
    handleScrape,
    handleDelete,
    handleReprocess,
  }
}
