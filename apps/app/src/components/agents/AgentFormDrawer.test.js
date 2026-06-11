// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount } from "@vue/test-utils"

vi.mock("@/stores/agents", () => ({
  useAgentsStore: () => ({ setDefaultAgent: vi.fn() }),
}))

import AgentFormDrawer from "@/components/agents/AgentFormDrawer.vue"

const SelectStub = {
  props: ["value", "disabled"],
  template: "<div class='select-stub'><slot /></div>",
}

const STUBS = {
  teleport: true,
  "a-form": { template: "<form><slot /></form>" },
  "a-form-item": { template: "<div><slot /></div>" },
  "a-input": true,
  "a-textarea": true,
  "a-select": SelectStub,
  "a-select-option": {
    props: ["value", "label"],
    template: "<div class='option-stub'><slot /></div>",
  },
  "a-slider": true,
  "a-input-number": true,
}

function mountDrawer(agent = null) {
  return mount(AgentFormDrawer, {
    props: { open: true, agent, workspaceId: "ws1" },
    global: { stubs: STUBS },
  })
}

describe("AgentFormDrawer model picker", () => {
  beforeEach(() => vi.clearAllMocks())

  it("renders the five catalog models with descriptions and badges", () => {
    const wrapper = mountDrawer()
    expect(wrapper.findAll(".model-opt")).toHaveLength(5)
    expect(wrapper.text()).toContain("Smartest — gives the best answers to hard questions")
    expect(wrapper.text()).toContain("Recommended")
    expect(wrapper.text()).toContain("Classic")
  })

  it("defaults new agents to GPT-5.4 Mini", () => {
    const wrapper = mountDrawer()
    expect(wrapper.findComponent(SelectStub).props("value")).toBe("openai/gpt-5.4-mini")
  })

  it("adds a 'No longer offered' entry when the saved model is unknown", () => {
    const wrapper = mountDrawer({
      id: "a1",
      name: "Old",
      model_config: { model: "anthropic/claude-sonnet-4-6" },
    })
    expect(wrapper.findAll(".model-opt")).toHaveLength(6)
    expect(wrapper.text()).toContain("No longer offered")
  })

  it("does not add an extra entry for a catalog model", () => {
    const wrapper = mountDrawer({
      id: "a1",
      name: "Ok",
      model_config: { model: "openai/gpt-4o" },
    })
    expect(wrapper.findAll(".model-opt")).toHaveLength(5)
  })
})

describe("AgentFormDrawer help-me-choose guide", () => {
  beforeEach(() => vi.clearAllMocks())

  it("toggles the guide panel from the link", async () => {
    const wrapper = mountDrawer()
    expect(wrapper.find(".guide-panel").exists()).toBe(false)
    await wrapper.find(".guide-link").trigger("click")
    expect(wrapper.find(".guide-panel").exists()).toBe(true)
    expect(wrapper.text()).toContain("What will you mostly use it for?")
  })

  it("shows a recommendation when a chip is selected", async () => {
    const wrapper = mountDrawer()
    await wrapper.find(".guide-link").trigger("click")
    const chips = wrapper.findAll(".guide-chip")
    expect(chips.map((c) => c.text())).toEqual([
      "Everyday questions",
      "Difficult questions",
      "Lots of questions, low cost",
    ])
    expect(wrapper.find(".guide-reco").exists()).toBe(false)
    await chips[1].trigger("click")
    expect(wrapper.find(".guide-reco").text()).toContain("GPT-5.4")
    expect(wrapper.find(".guide-reco").text()).toContain("Our pick")
  })

  it("applies the recommended model and closes the panel on 'Use this'", async () => {
    const wrapper = mountDrawer()
    await wrapper.find(".guide-link").trigger("click")
    await wrapper.findAll(".guide-chip")[2].trigger("click")
    await wrapper.find(".guide-use-btn").trigger("click")
    expect(wrapper.findComponent(SelectStub).props("value")).toBe("openai/gpt-5.4-nano")
    expect(wrapper.find(".guide-panel").exists()).toBe(false)
  })

  it("hides the guide link for system agents", () => {
    const wrapper = mountDrawer({
      id: "sys",
      name: "System",
      is_system: true,
      model_config: { model: "openai/gpt-4.1" },
    })
    expect(wrapper.find(".guide-link").exists()).toBe(false)
  })
})
