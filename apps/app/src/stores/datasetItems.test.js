// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"

vi.mock("@/api/datasetItems", () => ({ listItems: vi.fn() }))

import { listItems } from "@/api/datasetItems"
import { useDatasetItemsStore, PAGE_LIMIT } from "@/stores/datasetItems"

const page = (items, next = null) => ({
  data: { data: { items, next_cursor: next, breadcrumbs: [] } },
})
const file = (id, status = "completed") => ({ kind: "file", id, filename: `${id}.md`, status })
const ctx = { workspaceId: "ws1", datasetId: "ds1" }

describe("useDatasetItemsStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it("sends limit, folder_id, and q, and omits empty params", async () => {
    listItems.mockResolvedValue(page([]))
    const store = useDatasetItemsStore()
    await store.load({ ...ctx, folderId: "f1", q: "rep" })
    await store.load(ctx)
    expect(listItems.mock.calls).toEqual([
      ["ws1", "ds1", { limit: PAGE_LIMIT, folder_id: "f1", q: "rep" }],
      ["ws1", "ds1", { limit: PAGE_LIMIT }],
    ])
  })

  it("ignores the response of an old search", async () => {
    let resolveOld
    listItems
      .mockReturnValueOnce(new Promise((r) => (resolveOld = r)))
      .mockResolvedValueOnce(page([file("new")]))
    const store = useDatasetItemsStore()
    const old = store.load({ ...ctx, q: "re" })
    await store.load({ ...ctx, q: "rep" })
    resolveOld(page([file("old")]))
    expect(await old).toBe(false)
    expect(store.items.map((i) => i.id)).toEqual(["new"])
  })

  it("appends the next page on Load more, then stops", async () => {
    listItems
      .mockResolvedValueOnce(page([file("a")], "c1"))
      .mockResolvedValueOnce(page([file("b")]))
    const store = useDatasetItemsStore()
    await store.load(ctx)
    await store.loadMore()
    await store.loadMore()
    expect(store.items.map((i) => i.id)).toEqual(["a", "b"])
    expect(listItems).toHaveBeenLastCalledWith("ws1", "ds1", { limit: PAGE_LIMIT, cursor: "c1" })
    expect(listItems).toHaveBeenCalledTimes(2)
  })

  it("lists only active files and applies the poll result", async () => {
    listItems.mockResolvedValue(
      page([{ kind: "folder", id: "d" }, file("a", "queued"), file("b", "processing"), file("c")]),
    )
    const store = useDatasetItemsStore()
    await store.load(ctx)
    expect(store.activeFileIds).toEqual(["a", "b"])
    store.applyStatuses(
      ["a", "b"],
      [{ id: "a", status: "completed", chunk_count: 3, error_message: null }],
    )
    expect(store.items.map((i) => [i.id, i.status])).toEqual([
      ["d", undefined],
      ["a", "completed"],
      ["c", "completed"],
    ])
    expect(store.activeFileIds).toEqual([])
  })

  it("removes folders and files by id", async () => {
    listItems.mockResolvedValue(page([{ kind: "folder", id: "d" }, file("a"), file("b")]))
    const store = useDatasetItemsStore()
    await store.load(ctx)
    store.removeItems(new Set(["d", "b"]))
    expect(store.items.map((i) => i.id)).toEqual(["a"])
  })
})
