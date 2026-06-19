// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { mount } from "@vue/test-utils"

import AgentDrawer from "@/components/chat/AgentDrawer.vue"

const AGENTS = [
  { id: "a1", name: "Helper", is_default: true },
  { id: "a2", name: "Researcher", model_config: { model: "anthropic/claude-opus-4-8" } },
  { id: "a3", name: "Coder", is_system: true },
]

const SELECTED = { id: "a1", name: "Helper", is_default: true }

/**
 * Mount AgentDrawer with sensible defaults.
 * The component is a pure panel — no overlay/drawer shell — so its content lives
 * directly in the component's own DOM (no teleport needed).
 * @param {Object} extraProps - additional props to merge
 * @returns {{ wrapper: import("@vue/test-utils").VueWrapper }}
 */
function mountPanel(extraProps = {}) {
  const wrapper = mount(AgentDrawer, {
    props: {
      agents: AGENTS,
      selectedAgentId: "a1",
      selectedAgent: SELECTED,
      total: 3,
      loading: false,
      ...extraProps,
    },
  })
  return { wrapper }
}

describe("AgentDrawer panel structure", () => {
  it("renders the .agent-drawer root element directly", () => {
    const { wrapper } = mountPanel()
    expect(wrapper.find(".agent-drawer").exists()).toBe(true)
  })

  it("renders the header title 'Select agent'", () => {
    const { wrapper } = mountPanel()
    expect(wrapper.find(".agent-drawer__title").text()).toBe("Select agent")
  })

  it("does NOT contain an a-drawer or teleport element (pure panel)", () => {
    const { wrapper } = mountPanel()
    expect(wrapper.html()).not.toContain("a-drawer")
  })

  it("declares a 'close' emit so the parent popover can wire @close", () => {
    // Outside-click is the a-popover's responsibility (via @open-change in ChatComposer);
    // the panel just declares 'close' so the @close binding in ChatComposer is valid.
    const { wrapper } = mountPanel()
    const emits = wrapper.vm.$options?.emits ?? wrapper.vm.$.type.emits ?? []
    expect(emits).toContain("close")
  })
})

describe("AgentDrawer list rendering", () => {
  it("renders the search input", () => {
    const { wrapper } = mountPanel()
    expect(wrapper.find(".agent-search__input").exists()).toBe(true)
  })

  it("pins the current agent as the active row and lists the rest separately", () => {
    const { wrapper } = mountPanel()
    expect(wrapper.findAll(".agent-row--active")).toHaveLength(1)
    // a2 + a3 are the non-current agents.
    expect(wrapper.findAll(".agent-row:not(.agent-row--active)")).toHaveLength(2)
  })

  it("excludes the current agent from the 'All agents' results", () => {
    const { wrapper } = mountPanel()
    const names = wrapper
      .findAll(".agent-row:not(.agent-row--active) .agent-row__name")
      .map((n) => n.text())
    expect(names).toEqual(["Researcher", "Coder"])
  })

  it("renders the agent descriptor (default / system / model) as the row meta", () => {
    const { wrapper } = mountPanel()
    const metas = wrapper.findAll(".agent-row__meta").map((m) => m.text())
    expect(metas).toContain("Default")
    expect(metas).toContain("System")
    expect(metas).toContain("claude-opus-4-8")
  })

  it("emits 'select' with the agent id when a result row is clicked", async () => {
    const { wrapper } = mountPanel()
    const row = wrapper.find(".agent-row:not(.agent-row--active)")
    await row.trigger("click")
    expect(wrapper.emitted("select")[0]).toEqual(["a2"])
  })

  it("emits 'select' with the current agent id when the active row is clicked", async () => {
    const { wrapper } = mountPanel()
    await wrapper.find(".agent-row--active").trigger("click")
    expect(wrapper.emitted("select")[0]).toEqual(["a1"])
  })

  it("emits 'search' when the search input fires an input event", async () => {
    const { wrapper } = mountPanel()
    await wrapper.find(".agent-search__input").setValue("res")
    expect(wrapper.emitted("search")).toBeTruthy()
  })
})

describe("AgentDrawer hints", () => {
  it("shows the 'Searching…' hint when loading=true", () => {
    const { wrapper } = mountPanel({ loading: true })
    expect(wrapper.find(".agent-drawer__hint").text()).toContain("Searching")
  })

  it("shows a no-match hint when a query yields no other agents", async () => {
    const { wrapper } = mountPanel({ agents: [SELECTED], selectedAgentId: "a1" })
    await wrapper.find(".agent-search__input").setValue("zzz")
    expect(wrapper.find(".agent-drawer__hint").text()).toContain("No agents match")
  })

  it("shows the truncation hint when total exceeds the fetched agents length", () => {
    const { wrapper } = mountPanel({ total: 50 })
    expect(wrapper.find(".agent-drawer__hint").text()).toContain("search to find more")
  })
})
