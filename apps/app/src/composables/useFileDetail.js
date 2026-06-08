import { ref, computed } from "vue"
import { listFileQuestions, listFileChunks } from "@/api/datasetFiles"

/** Chunks fetched per "Load more" page. */
const CHUNK_PAGE_SIZE = 5

/** Chunk sort params reused by first-load and load-more. */
function chunkParams(page) {
  return { page, limit: CHUNK_PAGE_SIZE, sort_by: "chunk_index", sort_order: "asc" }
}

/**
 * Ephemeral state + fetching for a single dataset file's exploration questions
 * and indexed chunk preview. Questions/chunks only exist once a file is
 * `completed`; non-completed files yield empty state with no network call.
 *
 * @param {string} workspaceId - Workspace UUID
 * @param {string} datasetId - Dataset UUID
 * @returns {object} Reactive state and loaders
 */
export function useFileDetail(workspaceId, datasetId) {
  const questions = ref([])
  const chunks = ref([])
  const chunksTotal = ref(0)
  const chunksPage = ref(1)
  const loadingQuestions = ref(false)
  const loadingChunks = ref(false)
  const errored = ref(false)
  const loadMoreError = ref(false)

  // Guards against out-of-order responses when the user switches files quickly.
  let activeFileId = null

  const hasMoreChunks = computed(() => chunks.value.length < chunksTotal.value)

  /** Clear all state. */
  function reset() {
    activeFileId = null
    questions.value = []
    chunks.value = []
    chunksTotal.value = 0
    chunksPage.value = 1
    loadingQuestions.value = false
    loadingChunks.value = false
    errored.value = false
    loadMoreError.value = false
  }

  /**
   * Load questions + the first chunk page for a file.
   *
   * @param {object|null} file - Dataset file record (needs `id`, `status`)
   * @returns {Promise<void>}
   */
  async function loadFile(file) {
    reset()
    if (!file || file.status !== "completed") return
    const fileId = file.id
    activeFileId = fileId
    loadingQuestions.value = true
    loadingChunks.value = true
    try {
      const [qRes, cRes] = await Promise.allSettled([
        listFileQuestions(workspaceId, datasetId, fileId),
        listFileChunks(workspaceId, datasetId, fileId, chunkParams(1)),
      ])
      if (activeFileId !== fileId) return
      questions.value = qRes.status === "fulfilled" ? (qRes.value?.data?.data ?? []) : []
      if (cRes.status === "fulfilled") {
        chunks.value = cRes.value?.data?.data ?? []
        chunksTotal.value = cRes.value?.data?.pagination?.total ?? chunks.value.length
        chunksPage.value = 1
      } else {
        errored.value = true
      }
    } finally {
      if (activeFileId === fileId) {
        loadingQuestions.value = false
        loadingChunks.value = false
      }
    }
  }

  /**
   * Append the next chunk page.
   *
   * @param {object} file - The currently open file record
   * @returns {Promise<void>}
   */
  async function loadMoreChunks(file) {
    if (!file || activeFileId !== file.id || loadingChunks.value || !hasMoreChunks.value) return
    const fileId = file.id
    loadMoreError.value = false
    loadingChunks.value = true
    try {
      const next = chunksPage.value + 1
      const cRes = await listFileChunks(workspaceId, datasetId, fileId, chunkParams(next))
      if (activeFileId !== fileId) return
      chunks.value = chunks.value.concat(cRes?.data?.data ?? [])
      chunksTotal.value = cRes?.data?.pagination?.total ?? chunksTotal.value
      chunksPage.value = next
    } catch {
      if (activeFileId === fileId) loadMoreError.value = true
    } finally {
      if (activeFileId === fileId) loadingChunks.value = false
    }
  }

  return {
    questions,
    chunks,
    chunksTotal,
    chunksPage,
    loadingQuestions,
    loadingChunks,
    errored,
    loadMoreError,
    hasMoreChunks,
    loadFile,
    loadMoreChunks,
    reset,
  }
}
