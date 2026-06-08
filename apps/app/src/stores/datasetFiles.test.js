// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"

vi.mock("@/api/datasetFiles", () => ({
  listFiles: vi.fn(),
  uploadFile: vi.fn(),
  scrapeUrl: vi.fn(),
  deleteFile: vi.fn(),
  reprocessFile: vi.fn(),
  updateFile: vi.fn(),
}))

import * as filesApi from "@/api/datasetFiles"
import { useDatasetFilesStore } from "@/stores/datasetFiles"

describe("useDatasetFilesStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it("renameFile patches the matching file with the server-returned record", async () => {
    const updated = { id: "f1", filename: "renamed.pdf", status: "completed" }
    filesApi.updateFile.mockResolvedValue({ data: { data: updated }, status: 200 })

    const store = useDatasetFilesStore()
    store.files = [
      { id: "f1", filename: "old.pdf", status: "completed" },
      { id: "f2", filename: "other.pdf", status: "completed" },
    ]

    const result = await store.renameFile("ws1", "ds1", "f1", "renamed.pdf")

    expect(filesApi.updateFile).toHaveBeenCalledWith("ws1", "ds1", "f1", {
      filename: "renamed.pdf",
    })
    expect(result).toEqual(updated)
    expect(store.files.find((f) => f.id === "f1")).toEqual(updated)
    expect(store.files.find((f) => f.id === "f2").filename).toBe("other.pdf")
  })

  it("renameFile falls back to patching filename when no record is returned", async () => {
    filesApi.updateFile.mockResolvedValue({ data: {}, status: 200 })

    const store = useDatasetFilesStore()
    store.files = [{ id: "f1", filename: "old.pdf", status: "completed" }]

    const result = await store.renameFile("ws1", "ds1", "f1", "renamed.pdf")

    expect(result).toEqual({ id: "f1", filename: "renamed.pdf", status: "completed" })
    expect(store.files.find((f) => f.id === "f1").filename).toBe("renamed.pdf")
  })
})
