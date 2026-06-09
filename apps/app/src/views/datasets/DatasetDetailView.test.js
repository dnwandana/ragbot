// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { ref } from "vue"
import { mount, flushPromises } from "@vue/test-utils"

const { handleRename } = vi.hoisted(() => ({ handleRename: vi.fn() }))
const { bulkDelete } = vi.hoisted(() => ({ bulkDelete: vi.fn() }))
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
    bulkDelete,
  }),
}))

import { message } from "ant-design-vue"
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

describe("DatasetDetailView form model binding", () => {
  // Capturing stub: records the `model` prop each <a-form> receives and renders its slot.
  const FormStub = {
    name: "AFormStub",
    props: ["model"],
    template: "<form><slot /></form>",
  }
  // Render modal slot contents so the forms inside are mounted.
  const SlotModalStub = {
    name: "ASlotModalStub",
    props: ["open", "title"],
    template: "<div class='a-modal-stub'><slot /></div>",
  }
  const FORM_STUBS = {
    ...STUBS,
    "a-modal": SlotModalStub,
    "a-form": FormStub,
    "a-form-item": { template: "<div><slot /></div>" },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    fetchDataset.mockResolvedValue({ id: "ds1", name: "Docs", description: "" })
    files.value = []
  })

  it("binds :model on the edit-dataset and rename-file forms", async () => {
    const wrapper = mount(DatasetDetailView, { global: { stubs: FORM_STUBS } })
    await flushPromises()

    const forms = wrapper.findAllComponents(FormStub)
    expect(forms).toHaveLength(2)
    // Document order: edit-dataset form first, rename-file form second.
    expect(forms[0].props("model")).toBe(wrapper.vm.editForm)
    expect(forms[1].props("model")).toBe(wrapper.vm.renameForm)
  })
})

describe("DatasetDetailView bulk delete", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchDataset.mockResolvedValue({ id: "ds1", name: "Docs", description: "" })
    bulkDelete.mockResolvedValue([]) // no failures; bulkDelete returns failed-id array
    files.value = [
      { id: "f1", filename: "a.pdf", status: "completed", file_size_bytes: 0, chunk_count: 0 },
      { id: "f2", filename: "b.pdf", status: "completed", file_size_bytes: 0, chunk_count: 0 },
    ]
  })

  it("opens a confirmation modal instead of deleting immediately", async () => {
    const wrapper = mountView()
    await flushPromises()

    wrapper.vm.toggleOne("f1")
    wrapper.vm.toggleOne("f2")
    await flushPromises()

    await wrapper.find(".btn-danger").trigger("click")

    expect(wrapper.vm.bulkDeleteOpen).toBe(true)
    expect(bulkDelete).not.toHaveBeenCalled()
  })

  it("deletes the selected files when the bulk delete is confirmed", async () => {
    const wrapper = mountView()
    await flushPromises()

    wrapper.vm.toggleOne("f1")
    wrapper.vm.toggleOne("f2")
    await flushPromises()

    await wrapper.vm.confirmBulkDelete()
    await flushPromises()

    expect(bulkDelete).toHaveBeenCalledWith(["f1", "f2"])
    expect(wrapper.vm.bulkDeleteOpen).toBe(false)
  })

  it("dismisses without deleting when the modal's cancel is triggered", async () => {
    const CancelableModalStub = {
      name: "ACancelableModalStub",
      props: ["open", "confirmLoading", "title"],
      emits: ["ok", "cancel"],
      template:
        "<div v-if=\"open\" class='a-modal-stub'><slot /><button class='modal-cancel' @click=\"$emit('cancel')\">Cancel</button></div>",
    }
    const wrapper = mount(DatasetDetailView, {
      global: { stubs: { ...STUBS, "a-modal": CancelableModalStub } },
    })
    await flushPromises()

    wrapper.vm.toggleOne("f1")
    await flushPromises()
    await wrapper.find(".btn-danger").trigger("click")
    expect(wrapper.vm.bulkDeleteOpen).toBe(true)

    await wrapper.find(".modal-cancel").trigger("click")
    await flushPromises()

    expect(wrapper.vm.bulkDeleteOpen).toBe(false)
    expect(bulkDelete).not.toHaveBeenCalled()
  })

  it("disables re-submit by holding bulkDeleting true while the delete is in flight", async () => {
    let resolveDelete
    bulkDelete.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDelete = resolve
        }),
    )

    const wrapper = mountView()
    await flushPromises()

    wrapper.vm.toggleOne("f1")
    wrapper.vm.bulkDeleteOpen = true
    await flushPromises()

    const pending = wrapper.vm.confirmBulkDelete()
    await flushPromises()
    expect(wrapper.vm.bulkDeleting).toBe(true)

    resolveDelete([])
    await pending
    await flushPromises()
    expect(wrapper.vm.bulkDeleting).toBe(false)
    expect(wrapper.vm.bulkDeleteOpen).toBe(false)
    expect(bulkDelete).toHaveBeenCalledWith(["f1"])
  })

  it("keeps the modal open, toasts, and resets loading when the bulk delete throws", async () => {
    bulkDelete.mockRejectedValue(new Error("boom"))

    const wrapper = mountView()
    await flushPromises()

    wrapper.vm.toggleOne("f1")
    wrapper.vm.bulkDeleteOpen = true
    await flushPromises()

    await wrapper.vm.confirmBulkDelete()
    await flushPromises()

    expect(message.error).toHaveBeenCalledWith("Failed to delete files")
    expect(wrapper.vm.bulkDeleting).toBe(false)
    expect(wrapper.vm.bulkDeleteOpen).toBe(true)
  })

  it("retains failed files in the selection and still closes the modal on partial failure", async () => {
    bulkDelete.mockResolvedValue(["f2"]) // resolves (never rejects); f2 failed, f1 succeeded

    const wrapper = mountView()
    await flushPromises()

    wrapper.vm.toggleOne("f1")
    wrapper.vm.toggleOne("f2")
    wrapper.vm.bulkDeleteOpen = true
    await flushPromises()

    await wrapper.vm.confirmBulkDelete()
    await flushPromises()

    expect(bulkDelete).toHaveBeenCalledWith(["f1", "f2"])
    expect(wrapper.vm.selected.has("f1")).toBe(false)
    expect(wrapper.vm.selected.has("f2")).toBe(true)
    expect(wrapper.vm.bulkDeleteOpen).toBe(false)
  })

  it("pluralizes the bulk-bar label by selection count", async () => {
    const wrapper = mountView()
    await flushPromises()

    wrapper.vm.toggleOne("f1")
    await flushPromises()
    expect(wrapper.find(".bulk-label").text()).toBe("1 file selected")

    wrapper.vm.toggleOne("f2")
    await flushPromises()
    expect(wrapper.find(".bulk-label").text()).toBe("2 files selected")
  })
})
