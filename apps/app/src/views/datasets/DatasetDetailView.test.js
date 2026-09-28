// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"

const { handleRename } = vi.hoisted(() => ({ handleRename: vi.fn() }))
const { fetchDataset } = vi.hoisted(() => ({ fetchDataset: vi.fn() }))
const { perms } = vi.hoisted(() => ({ perms: new Set() }))
vi.mock("@/composables/usePermissions", () => ({
  usePermissions: () => ({ can: (p) => perms.has(p) }),
}))

const { fileStatuses } = vi.hoisted(() => ({ fileStatuses: vi.fn() }))
vi.mock("@/api/datasetFiles", () => ({ fileStatuses }))

const { moveItems, readDroppedItems, upload } = vi.hoisted(() => ({
  moveItems: vi.fn(),
  readDroppedItems: vi.fn(),
  upload: vi.fn(),
}))
vi.mock("@/api/datasetItems", () => ({ moveItems }))
vi.mock("@/utils/droppedEntries", () => ({
  readDroppedItems,
  hasDroppedFiles: (dt) => dt.types.includes("Files"),
}))
vi.mock("@/composables/useFolderUpload", async () => {
  const { ref } = await import("vue")
  return {
    useFolderUpload: () => ({
      uploads: ref([]),
      running: ref(false),
      error: ref(""),
      upload,
      reset: vi.fn(),
    }),
  }
})

const { route, push } = vi.hoisted(() => ({
  route: { params: { workspaceId: "ws1", datasetId: "ds1" }, query: {} },
  push: vi.fn(),
}))
vi.mock("vue-router", async (importOriginal) => {
  const { reactive } = await import("vue")
  const r = reactive(route)
  push.mockImplementation((to) => (r.query = to.query ?? {}))
  return {
    ...(await importOriginal()),
    useRoute: () => r,
    useRouter: () => ({ push, replace: push }),
  }
})

const { store } = vi.hoisted(() => ({
  store: {
    items: [],
    breadcrumbs: [],
    nextCursor: null,
    loading: false,
    loadingMore: false,
    load: vi.fn(),
    loadMore: vi.fn(),
    removeItems: vi.fn(),
    applyStatuses: vi.fn(),
    activeFileIds: [],
  },
}))
vi.mock("@/stores/datasetItems", async () => {
  const { reactive } = await import("vue")
  const s = reactive(store)
  return { useDatasetItemsStore: () => s, ACTIVE_STATUSES: ["queued", "processing"] }
})

vi.mock("ant-design-vue", () => ({
  message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

vi.mock("@/stores/datasets", () => ({
  useDatasetsStore: () => ({
    fetchDataset,
    updateDataset: vi.fn(),
    deleteDataset: vi.fn(),
  }),
}))

vi.mock("@/composables/useFormattedTime", () => ({
  useFormattedTime: () => ({ shortDate: (s) => s ?? "" }),
}))

vi.mock("@/composables/useDatasetFiles", () => ({
  useDatasetFiles: () => ({
    handleReprocess: vi.fn(),
    handleRename,
  }),
}))

import { message } from "ant-design-vue"
import DatasetDetailView from "@/views/datasets/DatasetDetailView.vue"
import FileDetailPanel from "@/components/datasets/FileDetailPanel.vue"

const STUBS = {
  AddSourceDrawer: true,
  FolderBreadcrumbs: true,
  DatasetItemsTable: true,
  FileDetailPanel: true,
  FolderNameDialog: true,
  MoveToDialog: true,
  DeleteItemsDialog: true,
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
    ;["file:read", "file:upload", "file:update", "file:delete"].forEach((p) => perms.add(p))
    fetchDataset.mockResolvedValue({ id: "ds1", name: "Docs", description: "" })
    handleRename.mockResolvedValue(undefined)
    route.query = {}
    store.load.mockResolvedValue(true)
    store.items = [
      {
        kind: "file",
        id: "f1",
        filename: "old.pdf",
        status: "completed",
        file_size_bytes: 0,
        chunk_count: 0,
      },
      {
        kind: "file",
        id: "f2",
        filename: "other.pdf",
        status: "completed",
        file_size_bytes: 0,
        chunk_count: 0,
      },
    ]
  })

  it("patches the open detail panel's filename when its file is renamed", async () => {
    const wrapper = mountView()
    await flushPromises()

    wrapper.vm.openDetail(store.items[0])
    await flushPromises()
    expect(wrapper.findComponent(FileDetailPanel).props("file").filename).toBe("old.pdf")

    wrapper.vm.openRename(store.items[0])
    wrapper.vm.renameForm.filename = "renamed.pdf"
    await wrapper.vm.submitRename()
    await flushPromises()

    expect(handleRename).toHaveBeenCalledWith("f1", "renamed.pdf")
    expect(wrapper.findComponent(FileDetailPanel).props("file").filename).toBe("renamed.pdf")
  })

  it("leaves the open detail panel untouched when a different file is renamed", async () => {
    const wrapper = mountView()
    await flushPromises()

    wrapper.vm.openDetail(store.items[0])
    await flushPromises()

    wrapper.vm.openRename(store.items[1])
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
    ;["file:read", "file:upload", "file:update", "file:delete"].forEach((p) => perms.add(p))
    fetchDataset.mockResolvedValue({ id: "ds1", name: "Docs", description: "" })
    route.query = {}
    store.load.mockResolvedValue(true)
    store.items = []
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

describe("DatasetDetailView folders", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;["file:read", "file:upload", "file:update", "file:delete"].forEach((p) => perms.add(p))
    route.query = {}
    store.items = []
    store.load.mockResolvedValue(true)
    fetchDataset.mockResolvedValue({ id: "ds1", name: "Docs", description: "" })
  })
  const lastLoad = () => store.load.mock.calls.at(-1)[0]

  it("loads the folder of the query and loads again after a navigation", async () => {
    route.query = { folder: "d1" }
    const wrapper = mountView()
    await flushPromises()
    expect(lastLoad()).toEqual({
      workspaceId: "ws1",
      datasetId: "ds1",
      folderId: "d1",
      q: "",
      status: "",
    })
    wrapper.findComponent({ name: "FolderBreadcrumbs" }).vm.$emit("navigate", null)
    await flushPromises()
    expect(push).toHaveBeenLastCalledWith({ query: {} })
    expect(lastLoad().folderId).toBeNull()
  })

  it("goes to the root when the folder does not exist", async () => {
    route.query = { folder: "gone" }
    store.load.mockRejectedValueOnce(
      Object.assign(new Error("Dataset folder not found"), { status: 404 }),
    )
    mountView()
    await flushPromises()
    expect(push).toHaveBeenCalledWith({ query: {} })
  })
})

describe("DatasetDetailView search", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    ;["file:read", "file:upload", "file:update", "file:delete"].forEach((p) => perms.add(p))
    route.query = {}
    store.items = []
    store.breadcrumbs = []
    store.load.mockResolvedValue(true)
    fetchDataset.mockResolvedValue({ id: "ds1", name: "Docs", description: "" })
  })
  afterEach(() => vi.useRealTimers())
  const lastLoad = () => store.load.mock.calls.at(-1)[0]

  it("waits 300 ms before it searches and maps the status filter", async () => {
    const wrapper = mountView()
    await flushPromises()
    await wrapper.find(".search-input").setValue("rep")
    expect(store.load).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(300)
    await flushPromises()
    expect(lastLoad().q).toBe("rep")
    await wrapper.findAll(".chip-filter")[2].trigger("click")
    await flushPromises()
    expect(lastLoad().status).toBe("queued,processing")
  })

  it("names the open folder in the placeholder and clears the search on a navigation", async () => {
    route.query = { folder: "d1" }
    store.breadcrumbs = [{ id: "d1", name: "Reports" }]
    const wrapper = mountView()
    await flushPromises()
    const input = wrapper.find(".search-input")
    expect(input.attributes("placeholder")).toBe("Search in Reports and subfolders…")
    await input.setValue("q1")
    vi.advanceTimersByTime(300)
    await flushPromises()
    expect(wrapper.find(".items-none").text()).toBe("No items match the search.")
    wrapper.findComponent({ name: "FolderBreadcrumbs" }).vm.$emit("navigate", null)
    await flushPromises()
    expect(input.element.value).toBe("")
    expect(lastLoad()).toMatchObject({ folderId: null, q: "" })
  })
})

describe("DatasetDetailView status polling", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    ;["file:read", "file:upload", "file:update", "file:delete"].forEach((p) => perms.add(p))
    route.query = {}
    store.load.mockResolvedValue(true)
    fetchDataset.mockResolvedValue({ id: "ds1", name: "Docs", description: "" })
  })
  afterEach(() => {
    store.activeFileIds = []
    vi.useRealTimers()
  })
  const tick = async () => {
    vi.advanceTimersByTime(5000)
    await flushPromises()
  }

  it("sends only the active ids and applies the rows", async () => {
    const rows = [{ id: "a", status: "completed", chunk_count: 4, error_message: null }]
    store.activeFileIds = ["a"]
    fileStatuses.mockResolvedValue({ data: { data: rows } })
    mountView()
    await flushPromises()
    expect(fileStatuses).not.toHaveBeenCalled()
    await tick()
    expect(fileStatuses).toHaveBeenCalledWith("ws1", "ds1", ["a"])
    expect(store.applyStatuses).toHaveBeenCalledWith(["a"], rows)
  })

  it("does not poll when no file is active", async () => {
    mountView()
    await flushPromises()
    await tick()
    expect(fileStatuses).not.toHaveBeenCalled()
  })

  it("sends at most 100 ids in one request", async () => {
    store.activeFileIds = Array.from({ length: 150 }, (_, i) => `f${i}`)
    fileStatuses.mockResolvedValue({ data: { data: [] } })
    mountView()
    await flushPromises()
    await tick()
    expect(fileStatuses.mock.calls.map((c) => c[2].length)).toEqual([100, 50])
  })

  it("stops after three failures in a row and shows a message", async () => {
    store.activeFileIds = ["a"]
    fileStatuses.mockRejectedValue(new Error("offline"))
    mountView()
    await flushPromises()
    for (let i = 0; i < 4; i++) await tick()
    expect(fileStatuses).toHaveBeenCalledTimes(3)
    expect(message.error).toHaveBeenCalledWith(
      "Could not reach server — refresh to check file status",
    )
  })

  it("stops the poll when the view unmounts", async () => {
    store.activeFileIds = ["a"]
    fileStatuses.mockResolvedValue({ data: { data: [] } })
    const wrapper = mountView()
    await flushPromises()
    wrapper.unmount()
    await tick()
    expect(fileStatuses).not.toHaveBeenCalled()
  })
})

describe("DatasetDetailView item actions", () => {
  const folder = {
    kind: "folder",
    id: "d1",
    name: "Reports",
    item_count: { folders: 0, files: 0 },
  }
  const file = { kind: "file", id: "f1", filename: "a.md", status: "completed" }
  const byName = (w, name) => w.findComponent({ name })
  const button = (w, text) => w.findAll("button").find((b) => b.text().includes(text))

  beforeEach(() => {
    vi.clearAllMocks()
    route.query = { folder: "p1" }
    store.items = [folder, file]
    store.load.mockResolvedValue(true)
    fetchDataset.mockResolvedValue({ id: "ds1", name: "Docs", description: "" })
    ;["file:read", "file:upload", "file:update", "file:delete"].forEach((p) => perms.add(p))
  })

  it("hides the write actions from a reader", async () => {
    perms.clear()
    perms.add("file:read")
    const w = mountView()
    await flushPromises()
    expect(button(w, "New folder")).toBeUndefined()
    expect(button(w, "Add source")).toBeUndefined()
    expect(byName(w, "DatasetItemsTable").props("selectable")).toBe(false)
  })

  it("creates a folder in the current folder and loads again", async () => {
    const w = mountView()
    await flushPromises()
    await button(w, "New folder").trigger("click")
    expect(byName(w, "FolderNameDialog").props()).toMatchObject({
      open: true,
      parentId: "p1",
      folder: null,
    })
    byName(w, "FolderNameDialog").vm.$emit("saved", { id: "n1", name: "Q1" })
    await flushPromises()
    expect(store.load).toHaveBeenCalledTimes(2)
  })

  it("deletes the selection from the bulk bar", async () => {
    const w = mountView()
    await flushPromises()
    byName(w, "DatasetItemsTable").vm.$emit("update:selected", new Set(["folder:d1", "file:f1"]))
    await flushPromises()
    await button(w, "Delete").trigger("click")
    expect(byName(w, "DeleteItemsDialog").props("items")).toEqual([folder, file])
    byName(w, "DeleteItemsDialog").vm.$emit("deleted", { folders: 1, files: 1 })
    await flushPromises()
    expect(store.removeItems).toHaveBeenCalledWith(["d1", "f1"])
    expect(w.find(".bulk-bar").exists()).toBe(false)
  })

  const menuEvent = {
    currentTarget: { getBoundingClientRect: () => ({ bottom: 0, right: 0 }) },
  }

  it("moves a folder from its row menu", async () => {
    const w = mountView()
    await flushPromises()
    byName(w, "DatasetItemsTable").vm.$emit("menu", { event: menuEvent, item: folder })
    await flushPromises()
    await button(w, "Move to").trigger("click")
    expect(byName(w, "MoveToDialog").props()).toMatchObject({
      open: true,
      folderIds: ["d1"],
      fileIds: [],
      currentFolderId: "p1",
    })
    byName(w, "MoveToDialog").vm.$emit("moved", { targetId: null })
    await flushPromises()
    expect(byName(w, "MoveToDialog").props("open")).toBe(false)
    expect(store.load).toHaveBeenCalledTimes(2)
  })

  it("moves the file of the detail panel and updates the panel", async () => {
    const w = mountView()
    await flushPromises()
    w.vm.openDetail(file)
    await flushPromises()
    byName(w, "FileDetailPanel").vm.$emit("move", file)
    await flushPromises()
    expect(byName(w, "MoveToDialog").props()).toMatchObject({
      open: true,
      fileIds: ["f1"],
      folderIds: [],
    })
    byName(w, "MoveToDialog").vm.$emit("moved", { targetId: "d9" })
    await flushPromises()
    expect(byName(w, "FileDetailPanel").props("file")).toMatchObject({ id: "f1", folder_id: "d9" })
  })

  it("opens a folder from the Location row of the detail panel", async () => {
    const w = mountView()
    await flushPromises()
    w.vm.openDetail(file)
    await flushPromises()
    byName(w, "FileDetailPanel").vm.$emit("navigate", "d1")
    await flushPromises()
    expect(push).toHaveBeenLastCalledWith({ query: { folder: "d1" } })
    expect(byName(w, "FileDetailPanel").props("open")).toBe(false)
  })

  it("shows only the read items in the file menu of a reader", async () => {
    perms.clear()
    perms.add("file:read")
    const w = mountView()
    await flushPromises()
    byName(w, "DatasetItemsTable").vm.$emit("menu", { event: menuEvent, item: file })
    await flushPromises()
    expect(button(w, "View details")).toBeDefined()
    expect(button(w, "Edit")).toBeUndefined()
    expect(button(w, "Move to")).toBeUndefined()
    expect(button(w, "Delete")).toBeUndefined()
  })
})

describe("DatasetDetailView drag-and-drop", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route.query = { folder: "p1" }
    // The view renders the table only when the folder has items.
    store.items = [{ kind: "folder", id: "d2", name: "Q1", item_count: { folders: 0, files: 0 } }]
    store.load.mockResolvedValue(true)
    fetchDataset.mockResolvedValue({ id: "ds1", name: "Docs", description: "" })
    ;["file:read", "file:upload", "file:update", "file:delete"].forEach((p) => perms.add(p))
  })
  const byName = (w, name) => w.findComponent({ name })

  it("moves the dragged items into a folder row", async () => {
    moveItems.mockResolvedValue({ data: { data: {} } })
    const w = mountView()
    await flushPromises()
    expect(byName(w, "DatasetItemsTable").props("draggable")).toBe(true)
    byName(w, "DatasetItemsTable").vm.$emit("move", {
      targetId: "d2",
      keys: ["folder:d1", "file:f1"],
    })
    await flushPromises()
    expect(moveItems).toHaveBeenCalledWith("ws1", "ds1", {
      folder_ids: ["d1"],
      file_ids: ["f1"],
      target_folder_id: "d2",
    })
    expect(store.load).toHaveBeenCalledTimes(2)
  })

  it("moves to the root from a crumb and shows a server error", async () => {
    moveItems.mockRejectedValue(
      Object.assign(new Error('A file named "a.md" already exists in "Docs".'), { status: 409 }),
    )
    const w = mountView()
    await flushPromises()
    byName(w, "FolderBreadcrumbs").vm.$emit("drop", { targetId: null, keys: ["file:f1"] })
    await flushPromises()
    expect(moveItems.mock.calls[0][2].target_folder_id).toBeNull()
    expect(message.error).toHaveBeenCalledWith('A file named "a.md" already exists in "Docs".')
    expect(store.load).toHaveBeenCalledTimes(1)
  })

  it("uploads a drop from the computer into the current folder", async () => {
    const entries = [{ file: new File(["x"], "b.pdf"), relativePath: "docs/b.pdf" }]
    readDroppedItems.mockResolvedValue(entries)
    upload.mockResolvedValue({ uploaded: 1, failed: 0, skipped: ["docs/x.exe"] })
    const w = mountView()
    await flushPromises()
    const dataTransfer = { types: ["Files"] }
    await w.find(".page").trigger("dragenter", { dataTransfer })
    expect(w.find(".drop-overlay").text()).toContain("Drop to upload to")
    await w.find(".page").trigger("drop", { dataTransfer })
    await flushPromises()
    expect(upload).toHaveBeenCalledWith({ entries, parentId: "p1" })
    expect(message.success).toHaveBeenCalledWith("Uploaded 1 file")
    expect(message.warning).toHaveBeenCalledWith("Skipped 1 file with a type that is not supported")
    expect(w.find(".drop-overlay").exists()).toBe(false)
  })

  it("ignores a drop from the computer without file:upload", async () => {
    perms.delete("file:upload")
    const w = mountView()
    await flushPromises()
    await w.find(".page").trigger("drop", { dataTransfer: { types: ["Files"] } })
    expect(readDroppedItems).not.toHaveBeenCalled()
  })
})
