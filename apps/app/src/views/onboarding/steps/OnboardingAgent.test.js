// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { mount } from "@vue/test-utils"
import { reactive } from "vue"
import OnboardingAgent from "@/views/onboarding/steps/OnboardingAgent.vue"
import { AGENT_TEMPLATES } from "@/views/onboarding/agentTemplates.js"

/**
 * Minimal a-input stub: renders a native <input> with id and class forwarded,
 * emits update:value on input so the component's v-model:value wiring works.
 */
const AInputStub = {
  props: ["value", "placeholder", "autofocus", "id", "status"],
  emits: ["update:value"],
  template: `<input
    class="ant-input-stub"
    :id="id"
    :placeholder="placeholder"
    :value="value"
    @input="$emit('update:value', $event.target.value)"
  />`,
}

/**
 * Minimal a-textarea stub: renders a native <textarea>, emits update:value.
 */
const ATextareaStub = {
  props: ["value", "placeholder", "rows", "autoSize"],
  emits: ["update:value"],
  template: `<textarea
    class="ant-textarea-stub"
    :placeholder="placeholder"
    :value="value"
    :rows="rows"
    @input="$emit('update:value', $event.target.value)"
  />`,
}

/**
 * Minimal a-select stub: renders a <select> and emits "change" when the native
 * value changes, matching how the component's @change handler fires.
 * Slots are ignored since options are driven by the options prop.
 */
const ASelectStub = {
  props: ["value", "options", "placeholder"],
  emits: ["change"],
  template: `<select
    class="ant-select-stub"
    :value="value"
    @change="$emit('change', $event.target.value)"
  >
    <option v-for="opt in (options || [])" :key="opt.value" :value="opt.value">
      {{ opt.label }}
    </option>
  </select>`,
}

const STUBS = {
  "a-input": AInputStub,
  "a-textarea": ATextareaStub,
  "a-select": ASelectStub,
}

/**
 * Build a reactive fake of the onboarding shell context.
 * @returns {object} Reactive ctx with stubbed shell actions and state
 */
function makeCtx() {
  return reactive({
    errors: {},
    busy: null,
    setError: vi.fn(),
    back: vi.fn(),
    skip: vi.fn(),
    runAction: vi.fn(),
  })
}

/**
 * Mount OnboardingAgent with the Ant stubs injected.
 * @param {object} [agentProps] - Overrides for agentName/agentTemplate/agentPrompt
 * @param {object} [ctx] - Shell ctx to inject (defaults to a fresh fake)
 * @returns {import("@vue/test-utils").VueWrapper} The mounted wrapper
 */
function mountAgent(agentProps = {}, ctx = makeCtx()) {
  return mount(OnboardingAgent, {
    props: {
      ctx,
      agentName: "",
      agentTemplate: "blank",
      agentPrompt: "",
      ...agentProps,
    },
    global: { stubs: STUBS },
  })
}

describe("OnboardingAgent", () => {
  it("renders the step copy", () => {
    const wrapper = mountAgent()
    expect(wrapper.find(".ob-title").text()).toBe("Meet your first agent")
    expect(wrapper.find(".ob-subtitle").text()).toContain("job and a personality")
  })

  it("renders the a-input stub for agent name with correct placeholder and id", () => {
    const wrapper = mountAgent()
    const input = wrapper.find(".ant-input-stub")
    expect(input.exists()).toBe(true)
    expect(input.attributes("placeholder")).toBe("e.g. Support Sidekick")
    expect(input.attributes("id")).toBe("ag-name")
  })

  it("renders the a-textarea stub for the system prompt", () => {
    const wrapper = mountAgent()
    const ta = wrapper.find(".ant-textarea-stub")
    expect(ta.exists()).toBe(true)
    expect(ta.attributes("placeholder")).toContain("knowledge assistant")
  })

  it("renders the a-select stub for template selection", () => {
    const wrapper = mountAgent()
    const sel = wrapper.find(".ant-select-stub")
    expect(sel.exists()).toBe(true)
    // select should expose one <option> per AGENT_TEMPLATES entry
    const options = sel.findAll("option")
    expect(options).toHaveLength(AGENT_TEMPLATES.length)
  })

  it("reflects agentName prop as the input value", () => {
    const wrapper = mountAgent({ agentName: "Policy Pro" })
    expect(wrapper.find(".ant-input-stub").element.value).toBe("Policy Pro")
  })

  it("reflects agentPrompt prop as the textarea value", () => {
    const wrapper = mountAgent({ agentPrompt: "Answer only from sources." })
    expect(wrapper.find(".ant-textarea-stub").element.value).toBe("Answer only from sources.")
  })

  it("reflects agentTemplate prop as the select value", () => {
    const wrapper = mountAgent({ agentTemplate: "research" })
    expect(wrapper.find(".ant-select-stub").element.value).toBe("research")
  })

  it("emits update:agentName and clears the error on name input", async () => {
    const ctx = makeCtx()
    const wrapper = mountAgent({}, ctx)
    const input = wrapper.find(".ant-input-stub")
    input.element.value = "My Helper"
    await input.trigger("input")
    expect(wrapper.emitted("update:agentName")?.at(-1)).toEqual(["My Helper"])
    expect(ctx.setError).toHaveBeenCalledWith("agent", null)
  })

  it("emits update:agentPrompt on textarea input", async () => {
    const wrapper = mountAgent()
    const ta = wrapper.find(".ant-textarea-stub")
    ta.element.value = "Answer only from sources."
    await ta.trigger("input")
    expect(wrapper.emitted("update:agentPrompt")?.at(-1)).toEqual(["Answer only from sources."])
  })

  it("emits template, prompt, and name when selecting a template via a-select", async () => {
    const wrapper = mountAgent()
    const sel = wrapper.find(".ant-select-stub")
    sel.element.value = "research"
    await sel.trigger("change")
    expect(wrapper.emitted("update:agentTemplate")?.at(-1)).toEqual(["research"])
    expect(wrapper.emitted("update:agentName")?.at(-1)).toEqual(["Research Scout"])
    expect(wrapper.emitted("update:agentPrompt")?.at(-1)?.[0]).toContain("research analyst")
  })

  it("preserves a user-typed name when switching templates", async () => {
    const wrapper = mountAgent({ agentName: "Ada", agentTemplate: "support" })
    const sel = wrapper.find(".ant-select-stub")
    sel.element.value = "research"
    await sel.trigger("change")
    expect(wrapper.emitted("update:agentName")?.at(-1)).toEqual(["Ada"])
  })

  it("emits the new template's name when switching from a default name", async () => {
    const wrapper = mountAgent({ agentName: "Support Sidekick", agentTemplate: "support" })
    const sel = wrapper.find(".ant-select-stub")
    sel.element.value = "docs"
    await sel.trigger("change")
    expect(wrapper.emitted("update:agentName")?.at(-1)).toEqual(["Docs Expert"])
  })

  it("clears the prompt but keeps the name when picking Blank", async () => {
    const wrapper = mountAgent({ agentName: "Support Sidekick", agentTemplate: "support" })
    const sel = wrapper.find(".ant-select-stub")
    sel.element.value = "blank"
    await sel.trigger("change")
    expect(wrapper.emitted("update:agentTemplate")?.at(-1)).toEqual(["blank"])
    expect(wrapper.emitted("update:agentPrompt")?.at(-1)).toEqual([""])
    expect(wrapper.emitted("update:agentName")?.at(-1)).toEqual(["Support Sidekick"])
  })

  it("shows an error message when ctx.errors.agent is set", () => {
    const ctx = makeCtx()
    ctx.errors.agent = "Agent name is required"
    const wrapper = mountAgent({}, ctx)
    expect(wrapper.find(".ob-error-text").text()).toContain("Agent name is required")
  })

  it("calls ctx.back() when Back is clicked", async () => {
    const ctx = makeCtx()
    const wrapper = mountAgent({}, ctx)
    await wrapper.find(".ob-btn-ghost").trigger("click")
    expect(ctx.back).toHaveBeenCalled()
  })

  it("calls ctx.skip() when Skip is clicked", async () => {
    const ctx = makeCtx()
    const wrapper = mountAgent({}, ctx)
    await wrapper.find(".ob-btn-secondary").trigger("click")
    expect(ctx.skip).toHaveBeenCalled()
  })

  it("Create agent button is disabled when name is empty", () => {
    const wrapper = mountAgent({ agentName: "" })
    const btn = wrapper.findAll("button").find((b) => b.text().includes("Create agent"))
    expect(btn.attributes("disabled")).toBeDefined()
  })

  it("calls ctx.runAction('agent') when Create agent is clicked with a name", async () => {
    const ctx = makeCtx()
    const wrapper = mountAgent({ agentName: "Support Sidekick" }, ctx)
    const btn = wrapper.findAll("button").find((b) => b.text().includes("Create agent"))
    await btn.trigger("click")
    expect(ctx.runAction).toHaveBeenCalledWith("agent")
  })

  it("renders the system prompt hint text", () => {
    const wrapper = mountAgent()
    expect(wrapper.find(".ob-hint").text()).toContain("job description")
  })
})
