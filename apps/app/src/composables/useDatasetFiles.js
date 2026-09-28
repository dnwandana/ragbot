import { message } from "ant-design-vue"
import { useDatasetFilesStore } from "@/stores/datasetFiles"

/**
 * Returns the file actions of one dataset. The items store holds the loaded rows.
 * @param {string} workspaceId
 * @param {string} datasetId
 * @returns {{ handleReprocess: Function, handleRename: Function }}
 */
export function useDatasetFiles(workspaceId, datasetId) {
  const store = useDatasetFilesStore()

  async function handleReprocess(id) {
    await store.reprocessFile(workspaceId, datasetId, id)
    message.success("Reprocessing started")
  }

  async function handleRename(id, filename) {
    await store.renameFile(workspaceId, datasetId, id, filename)
    message.success("File renamed")
  }

  return {
    handleReprocess,
    handleRename,
  }
}
