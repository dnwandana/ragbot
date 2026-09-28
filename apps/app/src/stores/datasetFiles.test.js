// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"

vi.mock("@/api/datasetFiles", () => ({
  listFiles: vi.fn(),
  uploadFile: vi.fn(),
  scrapeUrl: vi.fn(),
  addYouTube: vi.fn(),
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

  it("sends folder_id with an upload, a scrape, and a YouTube link", async () => {
    filesApi.uploadFile.mockResolvedValue({ data: { data: {} } })
    filesApi.scrapeUrl.mockResolvedValue({ data: { data: {} } })
    filesApi.addYouTube.mockResolvedValue({ data: { data: {} } })
    const store = useDatasetFilesStore()
    await store.uploadFile("ws1", "ds1", new File(["x"], "a.md"), "f9")
    await store.scrapeUrl("ws1", "ds1", "https://a.example", "f9")
    await store.addYouTube("ws1", "ds1", "https://youtu.be/x", "f9")
    expect(filesApi.uploadFile.mock.calls[0][2].get("folder_id")).toBe("f9")
    expect(filesApi.scrapeUrl).toHaveBeenCalledWith("ws1", "ds1", "https://a.example", "f9")
    expect(filesApi.addYouTube).toHaveBeenCalledWith("ws1", "ds1", "https://youtu.be/x", "f9")
  })

  it("sends no folder_id with a root upload", async () => {
    filesApi.uploadFile.mockResolvedValue({ data: { data: {} } })
    await useDatasetFilesStore().uploadFile("ws1", "ds1", new File(["x"], "a.md"))
    expect(filesApi.uploadFile.mock.calls[0][2].has("folder_id")).toBe(false)
  })
})
