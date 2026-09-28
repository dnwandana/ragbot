import { ref, computed } from "vue"
import { defineStore } from "pinia"
import * as itemsApi from "@/api/datasetItems"

export const PAGE_LIMIT = 50
export const ACTIVE_STATUSES = ["queued", "processing"]

export const useDatasetItemsStore = defineStore("datasetItems", () => {
  const items = ref([])
  const nextCursor = ref(null)
  const breadcrumbs = ref([])
  const folderId = ref(null)
  const q = ref("")
  const status = ref("")
  const loading = ref(false)
  const loadingMore = ref(false)
  let ctx = null
  // Each load gets a new number. A response with an old number is ignored.
  let seq = 0

  const activeFileIds = computed(() =>
    items.value
      .filter((i) => i.kind === "file" && ACTIVE_STATUSES.includes(i.status))
      .map((i) => i.id),
  )

  const params = (cursor) => ({
    limit: PAGE_LIMIT,
    ...(cursor && { cursor }),
    ...(folderId.value && { folder_id: folderId.value }),
    ...(q.value && { q: q.value }),
    ...(status.value && { status: status.value }),
  })

  /**
   * Loads the first page of one folder, or of one search in the folder subtree.
   *
   * @param {object} args
   * @param {string} args.workspaceId - Workspace UUID
   * @param {string} args.datasetId - Dataset UUID
   * @param {string|null} [args.folderId] - Folder UUID, or `null` for the dataset root
   * @param {string} [args.q] - Search text. Empty means a plain folder listing.
   * @param {string} [args.status] - Status filter. Empty means all statuses.
   * @returns {Promise<boolean>} `false` when a newer request replaced this one
   * @throws The request error, when the request fails
   */
  async function load({
    workspaceId,
    datasetId,
    folderId: folder = null,
    q: query = "",
    status: st = "",
  }) {
    const mine = ++seq
    ctx = { workspaceId, datasetId }
    folderId.value = folder
    q.value = query
    status.value = st
    loading.value = true
    try {
      const res = await itemsApi.listItems(workspaceId, datasetId, params(null))
      if (mine !== seq) return false
      const data = res.data.data
      items.value = data.items
      nextCursor.value = data.next_cursor
      breadcrumbs.value = data.breadcrumbs
      return true
    } finally {
      if (mine === seq) loading.value = false
    }
  }

  /**
   * Appends the next page of the current listing. Does nothing when there is no next page.
   *
   * @returns {Promise<void>}
   */
  async function loadMore() {
    if (!nextCursor.value || loadingMore.value) return
    const mine = seq
    loadingMore.value = true
    try {
      const res = await itemsApi.listItems(ctx.workspaceId, ctx.datasetId, params(nextCursor.value))
      if (mine !== seq) return
      items.value.push(...res.data.data.items)
      nextCursor.value = res.data.data.next_cursor
    } finally {
      loadingMore.value = false
    }
  }

  /**
   * Loads the first page of the current folder or search again.
   *
   * @returns {Promise<boolean>} `false` when a newer request replaced this one
   */
  const reload = () => load({ ...ctx, folderId: folderId.value, q: q.value, status: status.value })

  /**
   * Applies one status poll result to the loaded files.
   * A polled id without a row is a deleted file, so the store removes it.
   *
   * @param {string[]} ids - The file ids of the polled batch
   * @param {Array<{id: string, status: string, chunk_count: number, error_message: string|null}>} rows
   *   - The rows of `POST /files/status`
   * @returns {void}
   */
  function applyStatuses(ids, rows) {
    const polled = new Set(ids)
    const byId = new Map(rows.map((r) => [r.id, r]))
    items.value = items.value.filter(
      (i) => i.kind !== "file" || !polled.has(i.id) || byId.has(i.id),
    )
    for (const i of items.value) {
      if (i.kind === "file" && byId.has(i.id)) Object.assign(i, byId.get(i.id))
    }
  }

  /**
   * Removes folders and files by id, for example after a delete.
   *
   * @param {Iterable<string>} ids - Folder and file ids
   * @returns {void}
   */
  function removeItems(ids) {
    const gone = new Set(ids)
    items.value = items.value.filter((i) => !gone.has(i.id))
  }

  /**
   * Clears the state. A response that arrives after the reset is ignored.
   *
   * @returns {void}
   */
  function reset() {
    seq++
    ctx = null
    items.value = []
    nextCursor.value = null
    breadcrumbs.value = []
    folderId.value = null
    q.value = ""
    status.value = ""
    loading.value = false
    loadingMore.value = false
  }

  return {
    items,
    nextCursor,
    breadcrumbs,
    folderId,
    q,
    status,
    loading,
    loadingMore,
    activeFileIds,
    load,
    loadMore,
    reload,
    applyStatuses,
    removeItems,
    reset,
  }
})
