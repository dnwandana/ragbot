// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { mount } from "@vue/test-utils"
import CodeRunCell from "@/components/chat/CodeRunCell.vue"

const thought = {
  tool: "execute_code",
  title: "Sum revenue by month",
  code: "import pandas as pd\nprint(1)",
  file_ids: ["f1"],
  filenames: ["orders.csv"],
}

const mountCell = (props = {}) =>
  mount(CodeRunCell, {
    props: { index: 1, thought, ...props },
    global: { stubs: { ChevronRight: true, Copy: true, Check: true } },
  })

/** Opens the cell body, then the section with the given label. */
const openSection = async (wrapper, label) => {
  await wrapper.find(".code-run-cell__head").trigger("click")
  const rows = wrapper.findAll(".collapsible-section__row")
  const row = rows.find((r) => r.text().includes(label))
  await row.trigger("click")
}

describe("CodeRunCell", () => {
  it("shows the title, the cell number and the elapsed time, and starts shut", () => {
    const wrapper = mountCell({ observation: { stdout: "42", stderr: "", duration_ms: 900 } })

    expect(wrapper.text()).toContain("In [1]")
    expect(wrapper.text()).toContain("Sum revenue by month")
    expect(wrapper.text()).toContain("0.9s")
    expect(wrapper.find(".code-run-cell__body").exists()).toBe(false)
  })

  it("opens the body on a click, with both sections still shut", async () => {
    const wrapper = mountCell({ observation: { stdout: "42", stderr: "", duration_ms: 900 } })

    await wrapper.find(".code-run-cell__head").trigger("click")

    expect(wrapper.text()).toContain("Input")
    expect(wrapper.text()).toContain("Output")
    expect(wrapper.text()).toContain("2 lines")
    expect(wrapper.find("pre").exists()).toBe(false)
  })

  it("shows the code only after the Input section opens", async () => {
    const wrapper = mountCell({ observation: { stdout: "42", stderr: "", duration_ms: 900 } })

    await openSection(wrapper, "Input")

    expect(wrapper.find(".code-run-cell__pre--code").text()).toContain("import pandas as pd")
  })

  it("shows a pulsing dot and no elapsed time while the cell runs", () => {
    const wrapper = mountCell({ observation: null })

    expect(wrapper.find(".code-run-cell__dot").exists()).toBe(true)
    expect(wrapper.find(".code-run-cell__meta").exists()).toBe(false)
  })

  it("names the exception on the shut Output row of a failed cell", async () => {
    const wrapper = mountCell({
      observation: {
        stdout: "",
        stderr: "Traceback (most recent call last):\nKeyError: 'revenue'",
        error: "error",
        duration_ms: 400,
      },
    })

    await wrapper.find(".code-run-cell__head").trigger("click")

    expect(wrapper.find(".code-run-cell__no").classes()).toContain("is-error")
    expect(wrapper.text()).toContain("failed")
    expect(wrapper.text()).toContain("KeyError")
  })

  it("falls back to the sandbox error code when the trace names no exception", async () => {
    const wrapper = mountCell({
      observation: { stdout: "", stderr: "sandbox is busy", error: "busy" },
    })

    await wrapper.find(".code-run-cell__head").trigger("click")

    expect(wrapper.text()).toContain("busy")
  })

  it("falls back to a cell number and hides the time for an old row", () => {
    const wrapper = mountCell({
      thought: { tool: "execute_code", code: "print(1)", file_ids: [] },
      index: 2,
      observation: { stdout: "1", stderr: "", error: null },
    })

    expect(wrapper.text()).toContain("Cell 2")
    expect(wrapper.find(".code-run-cell__meta").exists()).toBe(false)
  })

  it("copies the code without opening the cell", async () => {
    const writeText = vi.fn().mockResolvedValue()
    vi.stubGlobal("navigator", { clipboard: { writeText } })

    const wrapper = mountCell({ observation: { stdout: "1", stderr: "", duration_ms: 100 } })
    await wrapper.find(".code-run-cell__copy").trigger("click")

    expect(writeText).toHaveBeenCalledWith(thought.code)
    expect(wrapper.find(".code-run-cell__body").exists()).toBe(false)

    vi.unstubAllGlobals()
  })
})
