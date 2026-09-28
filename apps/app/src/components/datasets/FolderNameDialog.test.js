// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"

vi.mock("@/api/datasetFolders", () => ({ createFolder: vi.fn(), renameFolder: vi.fn() }))
vi.mock("ant-design-vue", () => ({ message: { error: vi.fn() } }))

import { createFolder, renameFolder } from "@/api/datasetFolders"
import { message } from "ant-design-vue"
import FolderNameDialog from "./FolderNameDialog.vue"

const stubs = {
  "a-modal": {
    props: ["open", "title"],
    template: "<div v-if='open'><h2>{{ title }}</h2><slot /></div>",
  },
  "a-form": { template: "<form @submit.prevent=\"$emit('finish')\"><slot /></form>" },
  "a-form-item": { props: ["help"], template: "<div><slot /><p class='help'>{{ help }}</p></div>" },
  "a-input": {
    props: ["value"],
    template: "<input :value='value' @input=\"$emit('update:value', $event.target.value)\" />",
  },
}
const httpError = (status, msg) => Object.assign(new Error(msg), { status })
const mountIt = (props) =>
  mount(FolderNameDialog, {
    props: { open: true, workspaceId: "ws1", datasetId: "ds1", ...props },
    global: { stubs },
  })

describe("FolderNameDialog", () => {
  beforeEach(() => vi.clearAllMocks())

  it("creates a folder in the parent and emits saved", async () => {
    createFolder.mockResolvedValue({ data: { data: { id: "n1", name: "Q1" } } })
    const w = mountIt({ parentId: "p1" })
    expect(w.find("h2").text()).toBe("New folder")
    await w.find("input").setValue("  Q1 ")
    await w.find("form").trigger("submit")
    await flushPromises()
    expect(createFolder).toHaveBeenCalledWith("ws1", "ds1", { parent_id: "p1", name: "Q1" })
    expect(w.emitted("saved")).toEqual([[{ id: "n1", name: "Q1" }]])
  })

  it("shows a 409 under the field, keeps the dialog open, and clears it on edit", async () => {
    renameFolder.mockRejectedValue(httpError(409, 'A folder named "B" already exists in "Docs".'))
    const w = mountIt({ folder: { id: "f1", name: "A" } })
    expect(w.find("input").element.value).toBe("A")
    await w.find("input").setValue("B")
    await w.find("form").trigger("submit")
    await flushPromises()
    expect(renameFolder).toHaveBeenCalledWith("ws1", "ds1", "f1", { name: "B" })
    expect(w.find(".help").text()).toBe('A folder named "B" already exists in "Docs".')
    expect(w.emitted("saved")).toBeUndefined()
    await w.find("input").setValue("C")
    expect(w.find(".help").text()).toBe("")
  })

  it.each([
    ["", "Name is required"],
    ["a/b", 'Name cannot contain "/"'],
    ["..", 'Name cannot be "." or ".."'],
  ])("rejects %j before a request", async (value, error) => {
    const w = mountIt({ parentId: null })
    await w.find("input").setValue(value)
    await w.find("form").trigger("submit")
    expect(w.find(".help").text()).toBe(error)
    expect(createFolder).not.toHaveBeenCalled()
  })

  it("shows other errors as a toast", async () => {
    createFolder.mockRejectedValue(httpError(500, "Server error"))
    const w = mountIt({ parentId: null })
    await w.find("input").setValue("Q1")
    await w.find("form").trigger("submit")
    await flushPromises()
    expect(message.error).toHaveBeenCalledWith("Server error")
    expect(w.find(".help").text()).toBe("")
  })
})
