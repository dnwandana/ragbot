// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { mount } from "@vue/test-utils"
import { reactive } from "vue"
import OnboardingAgent from "@/views/onboarding/steps/OnboardingAgent.vue"

/**
 * Build a reactive fake of the onboarding shell context.
 * @param {object} formOverrides - Fields merged over the default formData
 * @returns {object} Reactive ctx with formData and stubbed shell actions
 */
function makeCtx(formOverrides = {}) {
  return reactive({
    formData: { agentName: "", agentTemplate: "blank", agentPrompt: "", ...formOverrides },
    errors: {},
    busy: null,
    setError: vi.fn(),
    back: vi.fn(),
    skip: vi.fn(),
    runAction: vi.fn(),
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
    const wrapper = mount(OnboardingAgent, { props: { ctx: makeCtx() } })
    expect(wrapper.find(".ob-title").text()).toBe("Meet your first agent")
    expect(wrapper.find(".ob-subtitle").text()).toContain("job and a personality")
    expect(wrapper.find("#ag-name").attributes("placeholder")).toBe("e.g. Support Sidekick")
    expect(wrapper.find(".ob-hint").text()).toContain("job description")
  })

  it("renders all six template tiles", () => {
    const wrapper = mount(OnboardingAgent, { props: { ctx: makeCtx() } })
    expect(wrapper.findAll(".ob-tpl")).toHaveLength(6)
  })

  it("fills name and prompt when picking a template with an empty name", async () => {
    const ctx = makeCtx()
    const wrapper = mount(OnboardingAgent, { props: { ctx } })
    await tile(wrapper, "Research").trigger("click")
    expect(ctx.formData.agentTemplate).toBe("research")
    expect(ctx.formData.agentName).toBe("Research Scout")
    expect(ctx.formData.agentPrompt).toContain("research analyst")
  })

  it("swaps a default name when switching templates", async () => {
    const ctx = makeCtx({ agentName: "Support Sidekick", agentTemplate: "support" })
    const wrapper = mount(OnboardingAgent, { props: { ctx } })
    await tile(wrapper, "Docs expert").trigger("click")
    expect(ctx.formData.agentName).toBe("Docs Expert")
  })

  it("preserves a user-typed name when switching templates", async () => {
    const ctx = makeCtx({ agentName: "Ada", agentTemplate: "support" })
    const wrapper = mount(OnboardingAgent, { props: { ctx } })
    await tile(wrapper, "Research").trigger("click")
    expect(ctx.formData.agentName).toBe("Ada")
  })

  it("clears the prompt but keeps the name when picking Blank", async () => {
    const ctx = makeCtx({ agentName: "Support Sidekick", agentTemplate: "support" })
    const wrapper = mount(OnboardingAgent, { props: { ctx } })
    await tile(wrapper, "Blank").trigger("click")
    expect(ctx.formData.agentPrompt).toBe("")
    expect(ctx.formData.agentName).toBe("Support Sidekick")
  })
})
