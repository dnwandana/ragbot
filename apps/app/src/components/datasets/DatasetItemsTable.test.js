// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { mount } from "@vue/test-utils"

vi.mock("@/composables/useFormattedTime", () => ({
  useFormattedTime: () => ({ shortDate: () => "Sep 25" }),
}))

import DatasetItemsTable from "./DatasetItemsTable.vue"

const items = [
  { kind: "folder", id: "d1", name: "Reports", item_count: { folders: 1, files: 2 } },
  { kind: "folder", id: "d2", name: "Specs", item_count: { folders: 0, files: 0 } },
  { kind: "file", id: "f1", filename: "a.md", status: "queued", path: [{ id: "x", name: "Q1" }] },
]
const transfer = () => ({
  types: [],
  data: {},
  setData(t, v) {
    this.data[t] = v
    this.types.push(t)
  },
  getData(t) {
    return this.data[t]
  },
})
const mountIt = (props = {}) =>
  mount(DatasetItemsTable, {
    props: { items, selected: new Set(), selectable: true, draggable: true, ...props },
  })

describe("DatasetItemsTable", () => {
  it("renders folders with counts and files with status and path", () => {
    const rows = mountIt().findAll(".file-row")
    expect(rows).toHaveLength(3)
    expect(rows[0].text()).toContain("1 folder · 2 files")
    expect(rows[2].text()).toContain("in Q1")
    expect(rows[2].find(".status-dot").classes()).toContain("pulse")
  })

  it("opens a folder or a file on a row click", async () => {
    const w = mountIt()
    await w.findAll(".file-row")[0].trigger("click")
    await w.findAll(".file-row")[2].trigger("click")
    expect(w.emitted("open-folder")).toEqual([["d1"]])
    expect(w.emitted("open-file")[0][0].id).toBe("f1")
  })

  it("emits a new selection set and hides checkboxes when not selectable", async () => {
    const selected = new Set(["folder:d1"])
    const w = mountIt({ selected })
    await w.findAll(".file-row input")[2].trigger("change")
    expect([...w.emitted("update:selected")[0][0]]).toEqual(["folder:d1", "file:f1"])
    expect(selected.size).toBe(1)
    await w.find(".file-thead input").setValue(true)
    expect(w.emitted("update:selected")[1][0].size).toBe(3)
    expect(mountIt({ selectable: false, draggable: false }).find("input").exists()).toBe(false)
  })

  it("shows Load more only when there is a next page", async () => {
    expect(mountIt().find(".load-more").exists()).toBe(false)
    const w = mountIt({ hasMore: true })
    await w.find(".load-more button").trigger("click")
    expect(w.emitted("load-more")).toHaveLength(1)
  })

  it("moves the whole selection and refuses a drop on a dragged folder", async () => {
    const w = mountIt({ selected: new Set(["folder:d2", "file:f1"]) })
    const rows = w.findAll(".file-row")
    const dataTransfer = transfer()
    await rows[2].trigger("dragstart", { dataTransfer })
    await rows[1].trigger("dragover", { dataTransfer })
    expect(rows[1].classes()).toContain("row--invalid")
    await rows[1].trigger("drop", { dataTransfer })
    await rows[0].trigger("drop", { dataTransfer })
    expect(w.emitted("move")).toEqual([[{ targetId: "d1", keys: ["folder:d2", "file:f1"] }]])
  })
})
