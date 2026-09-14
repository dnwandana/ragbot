// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { mount } from "@vue/test-utils"
import CodeRunCard from "@/components/chat/CodeRunCard.vue"

const step = (overrides = {}) => ({
  thought: {
    tool: "execute_code",
    title: "Load the dataset",
    code: "print(1)",
    file_ids: ["f1"],
    filenames: ["orders.csv"],
  },
  observation: { stdout: "1", stderr: "", error: null, duration_ms: 900 },
  ...overrides,
})

const mountCard = (steps) =>
  mount(CodeRunCard, {
    props: { steps },
    global: {
      stubs: { Terminal: true, Check: true, CircleAlert: true, ChevronRight: true },
    },
  })

afterEach(() => {
  vi.useRealTimers()
})

describe("CodeRunCard", () => {
  it("renders nothing without steps", () => {
    expect(mountCard([]).find(".code-run-card").exists()).toBe(false)
  })

  it("summarizes the run in a shut header", () => {
    const wrapper = mountCard([step(), step()])

    expect(wrapper.text()).toContain("Code interpreter")
    expect(wrapper.text()).toContain("python")
    expect(wrapper.text()).toContain("orders.csv")
    expect(wrapper.text()).toContain("2 cells")
    expect(wrapper.text()).toContain("Done in 1.8s")
    expect(wrapper.find(".code-run-card__head").classes()).toContain("is-shut")
    expect(wrapper.findAllComponents({ name: "CodeRunCell" })).toHaveLength(0)
  })

  it("lists one cell per step once the header is clicked", async () => {
    const wrapper = mountCard([step(), step()])

    await wrapper.find(".code-run-card__head").trigger("click")

    const cells = wrapper.findAllComponents({ name: "CodeRunCell" })
    expect(cells).toHaveLength(2)
    expect(cells[1].props("index")).toBe(2)
  })

  it("counts up while a cell runs", async () => {
    vi.useFakeTimers()
    const wrapper = mountCard([step(), step({ observation: null })])

    expect(wrapper.text()).toContain("Running")

    vi.advanceTimersByTime(1000)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain("Running 1.9s")
  })

  it("marks a failed run without opening it", () => {
    const wrapper = mountCard([
      step(),
      step({
        observation: { stdout: "", stderr: "KeyError: 'x'", error: "error", duration_ms: 1 },
      }),
    ])

    expect(wrapper.find(".code-run-card").classes()).toContain("is-error")
    expect(wrapper.find(".code-run-card__pill").classes()).toContain("is-error")
    expect(wrapper.text()).toContain("Failed")
    expect(wrapper.find(".code-run-card__head").classes()).toContain("is-shut")
  })

  it("says only Done when an old row carries no duration", () => {
    const wrapper = mountCard([step({ observation: { stdout: "1", stderr: "", error: null } })])

    expect(wrapper.text()).toContain("Done")
    expect(wrapper.text()).not.toContain("Done in")
    expect(wrapper.text()).toContain("1 cell")
  })
})
