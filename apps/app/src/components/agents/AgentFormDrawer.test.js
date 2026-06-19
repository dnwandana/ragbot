// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"

const { setDefaultAgent } = vi.hoisted(() => ({ setDefaultAgent: vi.fn() }))
vi.mock("@/stores/agents", () => ({ useAgentsStore: () => ({ setDefaultAgent }) }))
vi.mock("ant-design-vue", () => ({ message: { success: vi.fn(), error: vi.fn() } }))

import { message } from "ant-design-vue"
import AgentFormDrawer from "@/components/agents/AgentFormDrawer.vue"

const SelectStub = {
  props: ["value", "disabled"],
  template: "<div class='select-stub'><slot /></div>",
}

// a-drawer stub: teleports its default slot to document.body, applies root-class-name
// as a class on the wrapper div, and only renders content when :open is true.
const ADrawerStub = {
  props: {
    open: { type: Boolean, default: false },
    rootClassName: { type: String, default: "" },
    placement: String,
    width: [Number, String],
    closable: Boolean,
    mask: Boolean,
    bodyStyle: Object,
    headerStyle: Object,
  },
  emits: ["close"],
  template: `
    <div>
      <teleport to="body">
        <div v-if="open" :class="rootClassName">
          <slot />
        </div>
      </teleport>
    </div>
  `,
}

const STUBS = {
  "a-drawer": ADrawerStub,
  // Stub a-form so that a native "submit" event on the element triggers the @finish handler.
  "a-form": {
    props: ["model"],
    emits: ["finish"],
    template: `<form @submit.prevent="$emit('finish', model)"><slot /></form>`,
  },
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

/**
 * Mount AgentFormDrawer with the drawer open and return both the wrapper and a
 * body-scoped query helper.
 * @param {Object|null} agent - Agent prop value (null = create mode)
 * @returns {{ wrapper: import("@vue/test-utils").VueWrapper, q: (sel: string) => Element|null, qq: (sel: string) => NodeListOf<Element> }}
 */
function mountDrawer(agent = null) {
  const wrapper = mount(AgentFormDrawer, {
    props: { open: true, agent, workspaceId: "ws1" },
    attachTo: document.body,
    global: { stubs: STUBS },
  })
  // Content is teleported to document.body; query from there.
  const q = (sel) => document.querySelector(sel)
  const qq = (sel) => document.querySelectorAll(sel)
  return { wrapper, q, qq }
}

describe("AgentFormDrawer a-drawer shell", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clean up any leftover teleported DOM between tests
    document.body.innerHTML = ""
  })

  it("renders .agent-drawer-root in the document when open", async () => {
    const { wrapper, q } = mountDrawer()
    await wrapper.vm.$nextTick()
    expect(q(".agent-drawer-root")).not.toBe(null)
    wrapper.unmount()
  })

  it("does not render .agent-drawer-root when closed", async () => {
    const wrapper = mount(AgentFormDrawer, {
      props: { open: false, agent: null, workspaceId: "ws1" },
      attachTo: document.body,
      global: { stubs: STUBS },
    })
    await wrapper.vm.$nextTick()
    expect(document.querySelector(".agent-drawer-root")).toBe(null)
    wrapper.unmount()
  })

  it("emits close when the close button is clicked", async () => {
    const { wrapper, q } = mountDrawer()
    await wrapper.vm.$nextTick()
    q(".close-btn").click()
    expect(wrapper.emitted("close")).toBeTruthy()
    wrapper.unmount()
  })

  it("emits submit when the form's finish event fires in create mode", async () => {
    const { wrapper, q } = mountDrawer()
    await wrapper.vm.$nextTick()
    // The a-form stub renders as <form>; dispatching "submit" triggers @finish → onSubmit → emit("submit").
    q("form").dispatchEvent(new Event("submit"))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted("submit")).toBeTruthy()
    wrapper.unmount()
  })
})

describe("AgentFormDrawer model picker", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
  })

  it("renders the five catalog models with descriptions and badges", async () => {
    const { wrapper, qq } = mountDrawer()
    await wrapper.vm.$nextTick()
    expect(qq(".model-opt")).toHaveLength(5)
    expect(document.body.textContent).toContain(
      "Smartest — gives the best answers to hard questions",
    )
    expect(document.body.textContent).toContain("Recommended")
    expect(document.body.textContent).toContain("Classic")
    wrapper.unmount()
  })

  it("defaults new agents to GPT-5.4 Mini", () => {
    const { wrapper } = mountDrawer()
    expect(wrapper.findComponent(SelectStub).props("value")).toBe("openai/gpt-5.4-mini")
    wrapper.unmount()
  })

  it("adds a 'No longer offered' entry when the saved model is unknown", async () => {
    const { wrapper, qq } = mountDrawer({
      id: "a1",
      name: "Old",
      model_config: { model: "anthropic/claude-sonnet-4-6" },
    })
    await wrapper.vm.$nextTick()
    expect(qq(".model-opt")).toHaveLength(6)
    expect(document.body.textContent).toContain("No longer offered")
    wrapper.unmount()
  })

  it("does not add an extra entry for a catalog model", async () => {
    const { wrapper, qq } = mountDrawer({
      id: "a1",
      name: "Ok",
      model_config: { model: "openai/gpt-4o" },
    })
    await wrapper.vm.$nextTick()
    expect(qq(".model-opt")).toHaveLength(5)
    wrapper.unmount()
  })
})

describe("AgentFormDrawer help-me-choose guide", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
  })

  it("toggles the guide panel from the link", async () => {
    const { wrapper, q } = mountDrawer()
    await wrapper.vm.$nextTick()
    expect(q(".guide-panel")).toBe(null)
    q(".guide-link").click()
    await wrapper.vm.$nextTick()
    expect(q(".guide-panel")).not.toBe(null)
    expect(document.body.textContent).toContain("What will you mostly use it for?")
    wrapper.unmount()
  })

  it("shows a recommendation when a chip is selected", async () => {
    const { wrapper, q, qq } = mountDrawer()
    await wrapper.vm.$nextTick()
    q(".guide-link").click()
    await wrapper.vm.$nextTick()
    const chips = qq(".guide-chip")
    expect([...chips].map((c) => c.textContent.trim())).toEqual([
      "Everyday questions",
      "Difficult questions",
      "Lots of questions, low cost",
    ])
    expect(q(".guide-reco")).toBe(null)
    chips[1].click()
    await wrapper.vm.$nextTick()
    expect(q(".guide-reco").textContent).toContain("GPT-5.4")
    expect(q(".guide-reco").textContent).toContain("Our pick")
    wrapper.unmount()
  })

  it("applies the recommended model and closes the panel on 'Use this'", async () => {
    const { wrapper, q, qq } = mountDrawer()
    await wrapper.vm.$nextTick()
    q(".guide-link").click()
    await wrapper.vm.$nextTick()
    qq(".guide-chip")[2].click()
    await wrapper.vm.$nextTick()
    q(".guide-use-btn").click()
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(SelectStub).props("value")).toBe("openai/gpt-5.4-nano")
    expect(q(".guide-panel")).toBe(null)
    wrapper.unmount()
  })

  it("hides the guide link for system agents", async () => {
    const { wrapper, q } = mountDrawer({
      id: "sys",
      name: "System",
      is_system: true,
      model_config: { model: "openai/gpt-4.1" },
    })
    await wrapper.vm.$nextTick()
    expect(q(".guide-link")).toBe(null)
    wrapper.unmount()
  })
})

describe("AgentFormDrawer submit-button label", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
  })

  it("reads 'Create agent' in create mode", async () => {
    const { wrapper, q } = mountDrawer()
    await wrapper.vm.$nextTick()
    expect(q(".btn-save").textContent.trim()).toBe("Create agent")
    wrapper.unmount()
  })

  it("reads 'Save changes' in edit mode", async () => {
    const { wrapper, q } = mountDrawer({
      id: "a1",
      name: "Existing",
      model_config: { model: "openai/gpt-4.1" },
    })
    await wrapper.vm.$nextTick()
    expect(q(".btn-save").textContent.trim()).toBe("Save changes")
    wrapper.unmount()
  })
})

describe("AgentFormDrawer default-agent toggle feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
  })

  it("calls setDefaultAgent and shows a success toast when toggled on", async () => {
    setDefaultAgent.mockResolvedValue({})
    const { wrapper, q } = mountDrawer({
      id: "a1",
      name: "Knowledge assistant",
      is_default: false,
      model_config: { model: "openai/gpt-4.1" },
    })
    await wrapper.vm.$nextTick()
    q(".toggle-switch").click()
    await flushPromises()

    expect(setDefaultAgent).toHaveBeenCalledWith("ws1", "a1")
    expect(message.success).toHaveBeenCalledWith("Knowledge assistant is now the default agent")
    wrapper.unmount()
  })

  it("shows an error toast and does not show success when setDefaultAgent fails", async () => {
    setDefaultAgent.mockRejectedValue(new Error("nope"))
    const { wrapper, q } = mountDrawer({
      id: "a1",
      name: "Knowledge assistant",
      is_default: false,
      model_config: { model: "openai/gpt-4.1" },
    })
    await wrapper.vm.$nextTick()
    q(".toggle-switch").click()
    await flushPromises()

    expect(setDefaultAgent).toHaveBeenCalledWith("ws1", "a1")
    expect(message.error).toHaveBeenCalledWith("Couldn't set the default agent. Please try again.")
    expect(message.success).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it("reflects is_default reactively without re-seeding the form on a same-id update", async () => {
    const { wrapper, q } = mountDrawer({
      id: "a1",
      name: "A",
      is_default: false,
      model_config: { model: "openai/gpt-4.1" },
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(SelectStub).props("value")).toBe("openai/gpt-4.1")

    // Same id, flipped default, different model → form must NOT re-seed (model stays),
    // but the is_default display must update.
    await wrapper.setProps({
      agent: { id: "a1", name: "A", is_default: true, model_config: { model: "openai/gpt-4o" } },
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(SelectStub).props("value")).toBe("openai/gpt-4.1")
    expect(q(".default-toggle-row--on")).not.toBe(null)
    wrapper.unmount()
  })

  it("re-seeds the form when a different agent is opened", async () => {
    const { wrapper } = mountDrawer({
      id: "a1",
      name: "A",
      model_config: { model: "openai/gpt-4.1" },
    })
    await wrapper.setProps({
      agent: { id: "a2", name: "B", model_config: { model: "openai/gpt-4o" } },
    })
    expect(wrapper.findComponent(SelectStub).props("value")).toBe("openai/gpt-4o")
    wrapper.unmount()
  })
})
