import { ref, toValue } from "vue"
import { ensureFolderPaths } from "@/api/datasetFolders"
import { useDatasetFilesStore } from "@/stores/datasetFiles"
import { humanSize, isUploadable } from "@/utils/files"

/** The API rejects more than 1000 paths in one ensure-paths request. */
const ENSURE_BATCH = 1000

/** Returns the directory part of a relative path, or "" for a loose file. */
const dirOf = (path) => path.slice(0, Math.max(path.lastIndexOf("/"), 0))

/**
 * Uploads dropped files and folders into a dataset folder. It creates the missing folders first,
 * then uploads each file into its folder.
 *
 * @param {object} options
 * @param {string|import("vue").Ref<string>|(() => string)} options.workspaceId - Workspace UUID
 * @param {string|import("vue").Ref<string>|(() => string)} options.datasetId - Dataset UUID
 * @returns {{
 *   uploads: import("vue").Ref<Array<{ id: string, name: string, size: string, status: "uploading"|"done"|"failed", error: string|null }>>,
 *   running: import("vue").Ref<boolean>,
 *   error: import("vue").Ref<string>,
 *   upload: (args: { entries: Array<{ file: File, relativePath: string }>, parentId?: string|null }) => Promise<{ uploaded: number, failed: number, skipped: string[] }>,
 *   reset: () => void,
 * }} The upload rows, the state flags, and the actions.
 */
export function useFolderUpload({ workspaceId, datasetId }) {
  const store = useDatasetFilesStore()
  const uploads = ref([])
  const running = ref(false)
  const error = ref("")

  /**
   * Creates the missing folders and uploads the accepted files one after the other. The upload
   * skips the file types that the API does not accept. If ensure-paths fails, no file is uploaded.
   *
   * @param {object} args
   * @param {Array<{ file: File, relativePath: string }>} args.entries - Dropped entries
   * @param {string|null} [args.parentId=null] - Target folder UUID, or `null` for the dataset root
   * @returns {Promise<{ uploaded: number, failed: number, skipped: string[] }>} The counts, and the
   *   relative paths of the skipped files
   */
  async function upload({ entries, parentId = null }) {
    const ws = toValue(workspaceId)
    const ds = toValue(datasetId)
    const accepted = []
    const skipped = []
    for (const e of entries) {
      if (isUploadable(e.file.name)) accepted.push(e)
      else skipped.push(e.relativePath)
    }
    // ensure-paths also creates every ancestor, so only the file directories are sent.
    const dirs = [...new Set(accepted.map((e) => dirOf(e.relativePath)).filter(Boolean))]
    const folderIds = {}
    running.value = true
    error.value = ""
    try {
      for (let i = 0; i < dirs.length; i += ENSURE_BATCH) {
        const body = { parent_id: parentId, paths: dirs.slice(i, i + ENSURE_BATCH) }
        Object.assign(folderIds, (await ensureFolderPaths(ws, ds, body)).data.data.paths)
      }
    } catch (err) {
      error.value = err?.message || "Could not create the folders"
      running.value = false
      return { uploaded: 0, failed: 0, skipped }
    }

    const start = uploads.value.length
    uploads.value.push(
      ...accepted.map((e, i) => ({
        id: `${start + i}`,
        name: e.relativePath,
        size: humanSize(e.file.size),
        status: "uploading",
        error: null,
      })),
    )
    let uploaded = 0
    // The uploads stay sequential, as in AddSourceDrawer.vue, to keep the rate limit load the same.
    for (const [i, e] of accepted.entries()) {
      const row = uploads.value[start + i]
      const dir = dirOf(e.relativePath)
      try {
        await store.uploadFile(ws, ds, e.file, dir ? folderIds[dir] : parentId)
        row.status = "done"
        uploaded++
      } catch (err) {
        row.status = "failed"
        row.error = err?.response?.data?.message || "Upload failed"
      }
    }
    running.value = false
    return { uploaded, failed: accepted.length - uploaded, skipped }
  }

  /** Clears the upload rows and the ensure-paths error. */
  function reset() {
    uploads.value = []
    error.value = ""
  }

  return { uploads, running, error, upload, reset }
}
