// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { mount } from "@vue/test-utils"
import FolderBreadcrumbs from "./FolderBreadcrumbs.vue"
import { DRAG_TYPE } from "./itemKeys"

const crumbs = [
  { id: "a", name: "Reports" },
  { id: "b", name: "2024" },
]
const dragEvent = (keys) => ({
  dataTransfer: { types: [DRAG_TYPE], getData: () => JSON.stringify(keys), dropEffect: "" },
})
const mountIt = (droppable = true) =>
  mount(FolderBreadcrumbs, { props: { datasetName: "Docs", breadcrumbs: crumbs, droppable } })

describe("FolderBreadcrumbs", () => {
  it("renders home, the ancestors as links, and the current folder as text", async () => {
    const w = mountIt()
    const links = w.findAll("button.crumb")
    expect(links.map((l) => l.text())).toEqual(["Docs", "Reports"])
    expect(w.find("[aria-current='page']").text()).toBe("2024")
    await links[1].trigger("click")
    await links[0].trigger("click")
    expect(w.emitted("navigate")).toEqual([["a"], [null]])
  })

  it("emits a drop on an ancestor and refuses a drop on the current folder", async () => {
    const w = mountIt()
    await w.findAll("button.crumb")[0].trigger("drop", dragEvent(["file:x"]))
    expect(w.emitted("drop")).toEqual([[{ targetId: null, keys: ["file:x"] }]])
    const current = w.find("[aria-current='page']")
    await current.trigger("dragover", dragEvent(["file:x"]))
    expect(current.classes()).toContain("crumb--invalid")
    await current.trigger("drop", dragEvent(["file:x"]))
    expect(w.emitted("drop")).toHaveLength(1)
  })

  it("ignores drops when droppable is false", async () => {
    const w = mountIt(false)
    await w.findAll("button.crumb")[0].trigger("drop", dragEvent(["file:x"]))
    expect(w.emitted("drop")).toBeUndefined()
  })
})
