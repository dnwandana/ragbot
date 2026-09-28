import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/utils/http", () => ({
  request: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
}))

import { request } from "@/utils/http"
import { listItems, moveItems, summarizeItems, deleteItems } from "@/api/datasetItems"

const BASE = "/workspaces/ws1/datasets/ds1/items"

describe("datasetItems api", () => {
  beforeEach(() => vi.clearAllMocks())

  it("lists items with params", () => {
    listItems("ws1", "ds1", { folder_id: "f1", q: "rep" })
    expect(request.get).toHaveBeenCalledWith(BASE, { params: { folder_id: "f1", q: "rep" } })
  })

  it("posts move, summary, and delete", () => {
    const ids = { folder_ids: ["a"], file_ids: ["b"] }
    moveItems("ws1", "ds1", { ...ids, target_folder_id: null })
    summarizeItems("ws1", "ds1", ids)
    deleteItems("ws1", "ds1", ids)
    expect(request.post.mock.calls).toEqual([
      [`${BASE}/move`, { ...ids, target_folder_id: null }, { silent: true }],
      [`${BASE}/summary`, ids],
      [`${BASE}/delete`, ids, { silent: true }],
    ])
  })
})
