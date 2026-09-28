// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"

vi.mock("@/api/datasetItems", () => ({ summarizeItems: vi.fn(), deleteItems: vi.fn() }))

import { summarizeItems, deleteItems } from "@/api/datasetItems"
import DeleteItemsDialog from "./DeleteItemsDialog.vue"

const AModal = {
  props: ["open", "title", "okButtonProps"],
  template: `<div v-if="open"><h2>{{ title }}</h2><slot />
    <button class="ok" :disabled="okButtonProps?.disabled" @click="$emit('ok')">OK</button></div>`,
}
const folder = { kind: "folder", id: "d1", name: "Reports" }
const file = { kind: "file", id: "f1", filename: "a.md" }
const mountIt = async (items) => {
  const w = mount(DeleteItemsDialog, {
    props: { open: true, workspaceId: "ws1", datasetId: "ds1", items },
    global: { stubs: { "a-modal": AModal } },
  })
  await flushPromises()
  return w
}

describe("DeleteItemsDialog", () => {
  beforeEach(() => vi.clearAllMocks())

  it("shows the subfolder and file counts of the selection", async () => {
    summarizeItems.mockResolvedValue({ data: { data: { folders: 3, files: 12 } } })
    const w = await mountIt([folder, file])
    expect(summarizeItems).toHaveBeenCalledWith("ws1", "ds1", {
      folder_ids: ["d1"],
      file_ids: ["f1"],
    })
    expect(w.find("h2").text()).toBe("Delete 2 items?")
    expect(w.text()).toContain("2 items will be permanently removed.")
    expect(w.text()).toContain("This includes 2 subfolders and 12 files.")
  })

  it("names a single file and sends no summary request", async () => {
    const w = await mountIt([file])
    expect(summarizeItems).not.toHaveBeenCalled()
    expect(w.find("h2").text()).toBe("Delete file?")
    expect(w.text()).toContain("a.md will be permanently removed.")
    expect(w.text()).not.toContain("This includes")
  })

  it("deletes and emits the deleted counts", async () => {
    summarizeItems.mockResolvedValue({ data: { data: { folders: 1, files: 0 } } })
    deleteItems.mockResolvedValue({ data: { data: { deleted: { folders: 1, files: 0 } } } })
    const w = await mountIt([folder])
    expect(w.find("h2").text()).toBe("Delete folder?")
    expect(w.text()).toContain("This includes 0 subfolders and 0 files.")
    await w.find(".ok").trigger("click")
    await flushPromises()
    expect(deleteItems).toHaveBeenCalledWith("ws1", "ds1", { folder_ids: ["d1"], file_ids: [] })
    expect(w.emitted("deleted")).toEqual([[{ folders: 1, files: 0 }]])
  })

  it("shows a delete error in the dialog", async () => {
    deleteItems.mockRejectedValue(
      Object.assign(new Error("Dataset file not found"), { status: 404 }),
    )
    const w = await mountIt([file])
    await w.find(".ok").trigger("click")
    await flushPromises()
    expect(w.find("[role='alert']").text()).toBe("Dataset file not found")
    expect(w.emitted("deleted")).toBeUndefined()
  })
})
