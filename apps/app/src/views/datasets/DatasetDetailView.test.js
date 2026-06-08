// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { ref } from "vue"
import { mount, flushPromises } from "@vue/test-utils"

const { handleRename } = vi.hoisted(() => ({ handleRename: vi.fn() }))
const { fetchDataset } = vi.hoisted(() => ({ fetchDataset: vi.fn() }))

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { workspaceId: "ws1", datasetId: "ds1" } }),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("ant-design-vue", () => ({
  message: { success: vi.fn(), error: vi.fn() },
}))

vi.mock("@/stores/datasets", () => ({
  useDatasetsStore: () => ({
    fetchDataset,
    updateDataset: vi.fn(),
    deleteDataset: vi.fn(),
  }),
}))

const files = ref([])
vi.mock("@/composables/useDatasetFiles", () => ({
  useDatasetFiles: () => ({
    files,
    filteredFiles: files,
    loading: ref(false),
    searchQuery: ref(""),
    filterStatus: ref("all"),
    fetchFiles: vi.fn().mockResolvedValue(undefined),
    handleDelete: vi.fn(),
    handleReprocess: vi.fn(),
    handleRename,
    bulkDelete: vi.fn(),
  }),
}))

import DatasetDetailView from "@/views/datasets/DatasetDetailView.vue"
import FileDetailPanel from "@/components/datasets/FileDetailPanel.vue"

const STUBS = {
  AddSourceDrawer: true,
  FileDetailPanel: true,
  teleport: true,
  "a-modal": true,
  "a-form": true,
  "a-form-item": true,
  "a-input": true,
  "a-textarea": true,
}

function mountView() {
  return mount(DatasetDetailView, { global: { stubs: STUBS } })
}

describe("DatasetDetailView rename sync", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchDataset.mockResolvedValue({ id: "ds1", name: "Docs", description: "" })
    handleRename.mockResolvedValue(undefined)
    files.value = [
      { id: "f1", filename: "old.pdf", status: "completed", file_size_bytes: 0, chunk_count: 0 },
      { id: "f2", filename: "other.pdf", status: "completed", file_size_bytes: 0, chunk_count: 0 },
    ]
  })

  it("patches the open detail panel's filename when its file is renamed", async () => {
    const wrapper = mountView()
    await flushPromises()

    wrapper.vm.openDetail(files.value[0])
    await flushPromises()
    expect(wrapper.findComponent(FileDetailPanel).props("file").filename).toBe("old.pdf")

    wrapper.vm.openRename(files.value[0])
    wrapper.vm.renameForm.filename = "renamed.pdf"
    await wrapper.vm.submitRename()
    await flushPromises()

    expect(handleRename).toHaveBeenCalledWith("f1", "renamed.pdf")
    expect(wrapper.findComponent(FileDetailPanel).props("file").filename).toBe("renamed.pdf")
  })

  it("leaves the open detail panel untouched when a different file is renamed", async () => {
    const wrapper = mountView()
    await flushPromises()

    wrapper.vm.openDetail(files.value[0])
    await flushPromises()

    wrapper.vm.openRename(files.value[1])
    wrapper.vm.renameForm.filename = "renamed-other.pdf"
    await wrapper.vm.submitRename()
    await flushPromises()

    expect(handleRename).toHaveBeenCalledWith("f2", "renamed-other.pdf")
    expect(wrapper.findComponent(FileDetailPanel).props("file").filename).toBe("old.pdf")
  })
})
