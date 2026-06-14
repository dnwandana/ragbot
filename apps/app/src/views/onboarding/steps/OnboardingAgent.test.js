// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { mount } from "@vue/test-utils"
import { reactive } from "vue"
import OnboardingAgent from "@/views/onboarding/steps/OnboardingAgent.vue"

/**
 * Build a reactive fake of the onboarding shell context.
 * Only the non-data members the step still reads off ctx are stubbed —
 * agent fields now flow through props/emits, not ctx.formData.
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
 * Mount OnboardingAgent with the new prop contract.
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
  })
}

/**
 * Find a template tile button by its visible label.
 * @param {import("@vue/test-utils").VueWrapper} wrapper - Mounted component
 * @param {string} label - Tile label text
 * @returns {import("@vue/test-utils").DOMWrapper} The tile button wrapper
 */
function tile(wrapper, label) {
  const hit = wrapper.findAll(".ob-tpl").find((b) => b.find(".ob-tpl-label").text() === label)
  if (!hit) throw new Error(`No template tile labelled "${label}"`)
  return hit
}

describe("OnboardingAgent", () => {
  it("renders the refreshed step copy", () => {
    const wrapper = mountAgent()
    expect(wrapper.find(".ob-title").text()).toBe("Meet your first agent")
    expect(wrapper.find(".ob-subtitle").text()).toContain("job and a personality")
    expect(wrapper.find("#ag-name").attributes("placeholder")).toBe("e.g. Support Sidekick")
    expect(wrapper.find(".ob-hint").text()).toContain("job description")
  })

  it("renders all six template tiles", () => {
    const wrapper = mountAgent()
    expect(wrapper.findAll(".ob-tpl")).toHaveLength(6)
  })

  it("reflects the agentTemplate prop as the active tile", () => {
    const wrapper = mountAgent({ agentTemplate: "research" })
    expect(tile(wrapper, "Research").classes()).toContain("is-active")
    expect(tile(wrapper, "Support").classes()).not.toContain("is-active")
  })

  it("emits template, prompt, and name when picking a template with an empty name", async () => {
    const wrapper = mountAgent()
    await tile(wrapper, "Research").trigger("click")
    expect(wrapper.emitted("update:agentTemplate")?.at(-1)).toEqual(["research"])
    expect(wrapper.emitted("update:agentName")?.at(-1)).toEqual(["Research Scout"])
    expect(wrapper.emitted("update:agentPrompt")?.at(-1)?.[0]).toContain("research analyst")
  })

  it("emits the new template's name when switching from a default name", async () => {
    const wrapper = mountAgent({ agentName: "Support Sidekick", agentTemplate: "support" })
    await tile(wrapper, "Docs expert").trigger("click")
    expect(wrapper.emitted("update:agentName")?.at(-1)).toEqual(["Docs Expert"])
  })

  it("preserves a user-typed name when switching templates", async () => {
    const wrapper = mountAgent({ agentName: "Ada", agentTemplate: "support" })
    await tile(wrapper, "Research").trigger("click")
    // nameForTemplate keeps the custom name, so the emitted value is unchanged.
    expect(wrapper.emitted("update:agentName")?.at(-1)).toEqual(["Ada"])
  })

  it("clears the prompt but keeps the name when picking Blank", async () => {
    const wrapper = mountAgent({ agentName: "Support Sidekick", agentTemplate: "support" })
    await tile(wrapper, "Blank").trigger("click")
    expect(wrapper.emitted("update:agentTemplate")?.at(-1)).toEqual(["blank"])
    expect(wrapper.emitted("update:agentPrompt")?.at(-1)).toEqual([""])
    expect(wrapper.emitted("update:agentName")?.at(-1)).toEqual(["Support Sidekick"])
  })

  it("emits update:agentName and clears the error on name input", async () => {
    const ctx = makeCtx()
    const wrapper = mountAgent({}, ctx)
    const input = wrapper.find("#ag-name")
    input.element.value = "My Helper"
    await input.trigger("input")
    expect(wrapper.emitted("update:agentName")?.at(-1)).toEqual(["My Helper"])
    expect(ctx.setError).toHaveBeenCalledWith("agent", null)
  })

  it("emits update:agentPrompt on textarea input", async () => {
    const wrapper = mountAgent()
    const ta = wrapper.find(".ob-textarea")
    ta.element.value = "Answer only from sources."
    await ta.trigger("input")
    expect(wrapper.emitted("update:agentPrompt")?.at(-1)).toEqual(["Answer only from sources."])
  })

  it("renders the agentName prop as the field value", () => {
    const wrapper = mountAgent({ agentName: "Policy Pro" })
    expect(wrapper.find("#ag-name").element.value).toBe("Policy Pro")
  })
})
