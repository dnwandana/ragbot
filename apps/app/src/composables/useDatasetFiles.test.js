// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { ref } from "vue"
import { setActivePinia, createPinia } from "pinia"

const { success, error } = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("ant-design-vue", () => ({ message: { success, error } }))

const { renameFile } = vi.hoisted(() => ({ renameFile: vi.fn() }))
vi.mock("@/stores/datasetFiles", () => ({
  useDatasetFilesStore: () => ({
    files: ref([]),
    loading: ref(false),
    renameFile,
  }),
}))

import { useDatasetFiles } from "@/composables/useDatasetFiles"

describe("useDatasetFiles", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it("handleRename calls store.renameFile and shows a success toast", async () => {
    renameFile.mockResolvedValue({ id: "f1", filename: "renamed.pdf" })

    const { handleRename } = useDatasetFiles("ws1", "ds1")
    await handleRename("f1", "renamed.pdf")

    expect(renameFile).toHaveBeenCalledWith("ws1", "ds1", "f1", "renamed.pdf")
    expect(success).toHaveBeenCalledWith("File renamed")
  })

  it("handleRename does not toast when the store action rejects", async () => {
    renameFile.mockRejectedValue(new Error("boom"))

    const { handleRename } = useDatasetFiles("ws1", "ds1")
    await expect(handleRename("f1", "renamed.pdf")).rejects.toThrow("boom")
    expect(success).not.toHaveBeenCalled()
  })
})
