import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/utils/http", () => ({
  request: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
}))

import { request } from "@/utils/http"
import { listFolders, createFolder, renameFolder, ensureFolderPaths } from "@/api/datasetFolders"

const BASE = "/workspaces/ws1/datasets/ds1/folders"

describe("datasetFolders api", () => {
  beforeEach(() => vi.clearAllMocks())

  it("calls the folder endpoints", () => {
    listFolders("ws1", "ds1", { parent_id: "p" })
    createFolder("ws1", "ds1", { parent_id: null, name: "A" })
    renameFolder("ws1", "ds1", "f1", { name: "B" })
    ensureFolderPaths("ws1", "ds1", { parent_id: null, paths: ["a/b"] })
    expect(request.get).toHaveBeenCalledWith(BASE, { params: { parent_id: "p" } })
    expect(request.post.mock.calls).toEqual([
      [BASE, { parent_id: null, name: "A" }, { silent: true }],
      [`${BASE}/ensure-paths`, { parent_id: null, paths: ["a/b"] }, { silent: true }],
    ])
    expect(request.put).toHaveBeenCalledWith(`${BASE}/f1`, { name: "B" }, { silent: true })
  })
})
