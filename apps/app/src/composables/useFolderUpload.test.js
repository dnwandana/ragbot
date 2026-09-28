// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"

const uploadFile = vi.fn()
vi.mock("@/stores/datasetFiles", () => ({ useDatasetFilesStore: () => ({ uploadFile }) }))
vi.mock("@/api/datasetFolders", () => ({ ensureFolderPaths: vi.fn() }))

import { ensureFolderPaths } from "@/api/datasetFolders"
import { useFolderUpload } from "@/composables/useFolderUpload"

const entry = (relativePath) => ({
  file: new File(["x"], relativePath.split("/").pop()),
  relativePath,
})
const entries = [entry("a.md"), entry("docs/b.pdf"), entry("docs/sub/c.txt"), entry("docs/x.exe")]

describe("useFolderUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    uploadFile.mockResolvedValue({})
  })

  it("creates the folders once and uploads each file into its folder", async () => {
    ensureFolderPaths.mockResolvedValue({
      data: { data: { paths: { docs: "d1", "docs/sub": "d2" } } },
    })
    const { upload, uploads } = useFolderUpload({ workspaceId: "ws1", datasetId: "ds1" })
    const result = await upload({ entries, parentId: "p1" })
    expect(ensureFolderPaths).toHaveBeenCalledOnce()
    expect(ensureFolderPaths).toHaveBeenCalledWith("ws1", "ds1", {
      parent_id: "p1",
      paths: ["docs", "docs/sub"],
    })
    expect(uploadFile.mock.calls.map((c) => [c[2].name, c[3]])).toEqual([
      ["a.md", "p1"],
      ["b.pdf", "d1"],
      ["c.txt", "d2"],
    ])
    expect(result).toEqual({ uploaded: 3, failed: 0, skipped: ["docs/x.exe"] })
    expect(uploads.value.map((u) => u.status)).toEqual(["done", "done", "done"])
  })

  it("sends no ensure-paths request for loose files", async () => {
    const { upload } = useFolderUpload({ workspaceId: "ws1", datasetId: "ds1" })
    await upload({ entries: [entry("a.md")] })
    expect(ensureFolderPaths).not.toHaveBeenCalled()
    expect(uploadFile).toHaveBeenCalledWith("ws1", "ds1", expect.any(File), null)
  })

  it("stops before the uploads when ensure-paths fails", async () => {
    ensureFolderPaths.mockRejectedValue(
      Object.assign(new Error("Folder path is too deep"), { status: 400 }),
    )
    const { upload, error } = useFolderUpload({ workspaceId: "ws1", datasetId: "ds1" })
    const result = await upload({ entries })
    expect(error.value).toBe("Folder path is too deep")
    expect(uploadFile).not.toHaveBeenCalled()
    expect(result.uploaded).toBe(0)
  })

  it("marks a failed file and continues with the next file", async () => {
    uploadFile.mockRejectedValueOnce({ response: { data: { message: "File too large" } } })
    const { upload, uploads } = useFolderUpload({ workspaceId: "ws1", datasetId: "ds1" })
    const result = await upload({ entries: [entry("a.md"), entry("b.md")] })
    expect(uploads.value.map((u) => [u.status, u.error])).toEqual([
      ["failed", "File too large"],
      ["done", null],
    ])
    expect(result).toEqual({ uploaded: 1, failed: 1, skipped: [] })
  })
})
