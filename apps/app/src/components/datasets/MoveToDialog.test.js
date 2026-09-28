// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"

vi.mock("@/api/datasetFolders", () => ({ listFolders: vi.fn() }))
vi.mock("@/api/datasetItems", () => ({ moveItems: vi.fn() }))

import { listFolders } from "@/api/datasetFolders"
import { moveItems } from "@/api/datasetItems"
import MoveToDialog from "./MoveToDialog.vue"

const AModal = {
  props: ["open", "title", "okButtonProps"],
  template: `<div v-if="open"><h2>{{ title }}</h2><slot />
    <button class="ok" :disabled="okButtonProps?.disabled" @click="$emit('ok')">OK</button></div>`,
}
const folders = (items, next = null) => ({ data: { data: { items, next_cursor: next } } })
const node = (id, has_children = true) => ({
  kind: "folder",
  id,
  name: id.toUpperCase(),
  has_children,
})
const base = {
  open: true,
  workspaceId: "ws1",
  datasetId: "ds1",
  datasetName: "Docs",
  currentFolderId: null,
  folderIds: ["b"],
  fileIds: ["f1"],
}
const mountIt = async (props = {}) => {
  const w = mount(MoveToDialog, {
    props: { ...base, ...props },
    global: { stubs: { "a-modal": AModal } },
  })
  await flushPromises()
  return w
}
const row = (w, name) => w.findAll(".tree-row").find((r) => r.text() === name)

describe("MoveToDialog", () => {
  beforeEach(() => vi.clearAllMocks())

  it("loads the root level and disables the root, the moved folder, and its subtree", async () => {
    listFolders.mockResolvedValue(folders([node("a"), node("b")]))
    const w = await mountIt()
    expect(w.find("h2").text()).toBe("Move 2 items")
    expect(listFolders).toHaveBeenCalledWith("ws1", "ds1", {})
    expect(row(w, "Docs").classes()).toContain("tree-row--disabled")
    expect(row(w, "B").classes()).toContain("tree-row--disabled")
    expect(row(w, "B").find(".tree-toggle button").exists()).toBe(false)
    expect(w.find(".ok").attributes("disabled")).toBeDefined()
  })

  it("loads a level once and keeps it after a collapse", async () => {
    listFolders
      .mockResolvedValueOnce(folders([node("a")]))
      .mockResolvedValueOnce(folders([node("c", false)], "k1"))
    const w = await mountIt()
    const toggle = () => row(w, "A").find(".tree-toggle button").trigger("click")
    await toggle()
    await flushPromises()
    expect(listFolders).toHaveBeenLastCalledWith("ws1", "ds1", { parent_id: "a" })
    expect(row(w, "C")).toBeTruthy()
    expect(w.find(".tree-more").exists()).toBe(true)
    await toggle()
    await toggle()
    expect(listFolders).toHaveBeenCalledTimes(2)
  })

  it("moves into the selected folder and emits moved", async () => {
    listFolders.mockResolvedValue(folders([node("a")]))
    moveItems.mockResolvedValue({ data: { data: {} } })
    const w = await mountIt()
    await row(w, "A").trigger("click")
    await w.find(".ok").trigger("click")
    await flushPromises()
    expect(moveItems).toHaveBeenCalledWith("ws1", "ds1", {
      folder_ids: ["b"],
      file_ids: ["f1"],
      target_folder_id: "a",
    })
    expect(w.emitted("moved")).toEqual([[{ targetId: "a" }]])
  })

  it("shows a server error in the dialog", async () => {
    listFolders.mockResolvedValue(folders([node("a")]))
    moveItems.mockRejectedValue(
      Object.assign(new Error('Cannot move "B" into its own subfolder.'), { status: 422 }),
    )
    const w = await mountIt({ currentFolderId: "a" })
    expect(row(w, "A").classes()).toContain("tree-row--disabled")
    await row(w, "Docs").trigger("click")
    await w.find(".ok").trigger("click")
    await flushPromises()
    expect(w.find("[role='alert']").text()).toBe('Cannot move "B" into its own subfolder.')
    expect(w.emitted("moved")).toBeUndefined()
  })
})
