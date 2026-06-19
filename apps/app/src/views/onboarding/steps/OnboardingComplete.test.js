// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { mount } from "@vue/test-utils"
import { reactive } from "vue"
import OnboardingComplete from "@/views/onboarding/steps/OnboardingComplete.vue"

/**
 * Stub for a-button — renders a <button> so click events and type assertions work.
 */
const AButtonStub = {
  props: ["type", "size", "block", "disabled", "loading"],
  template: `<button class="ant-btn-stub" :data-type="type" :disabled="disabled"><slot /></button>`,
}

const GLOBAL = {
  stubs: { "a-button": AButtonStub },
}

/**
 * Build a reactive fake of the onboarding shell context covering the complete step.
 * @param {Partial<{completed: Set, workspaceName: string, invites: Array, datasetName: string, files: Array, agentName: string}>} overrides
 * @returns {object} Reactive ctx with stubbed actions
 */
function makeCtx(overrides = {}) {
  return reactive({
    formData: {
      workspaceName: "Acme",
      invites: [],
      datasetName: "",
      files: [],
      agentName: "",
      ...overrides.formData,
    },
    completed: overrides.completed ?? new Set(["workspace"]),
    finish: vi.fn(),
    goToItem: vi.fn(),
    ...overrides,
  })
}

/**
 * Mount OnboardingComplete with the given ctx.
 * @param {object} [ctx] - Shell ctx override
 * @returns {import("@vue/test-utils").VueWrapper}
 */
function mountComplete(ctx = makeCtx()) {
  return mount(OnboardingComplete, {
    props: { ctx },
    global: GLOBAL,
  })
}

describe("OnboardingComplete", () => {
  it("renders the 'Setup complete' heading", () => {
    const wrapper = mountComplete()
    expect(wrapper.find(".ob-title").text()).toContain("Setup complete")
  })

  it("renders the Go to dashboard button as an a-button", () => {
    const wrapper = mountComplete()
    const buttons = wrapper.findAll(".ant-btn-stub")
    const dashBtn = buttons.find((b) => b.text().includes("Go to dashboard"))
    expect(dashBtn).toBeTruthy()
  })

  it("renders the Go to dashboard a-button with type='primary'", () => {
    const wrapper = mountComplete()
    const buttons = wrapper.findAll(".ant-btn-stub")
    const dashBtn = buttons.find((b) => b.text().includes("Go to dashboard"))
    expect(dashBtn?.attributes("data-type")).toBe("primary")
  })

  it("calls ctx.finish() when the Go to dashboard button is clicked", async () => {
    const ctx = makeCtx()
    const wrapper = mountComplete(ctx)
    const buttons = wrapper.findAll(".ant-btn-stub")
    const dashBtn = buttons.find((b) => b.text().includes("Go to dashboard"))
    await dashBtn?.trigger("click")
    expect(ctx.finish).toHaveBeenCalledOnce()
  })

  it("renders a CTA button for the completed workspace row as an a-button", () => {
    const ctx = makeCtx({ completed: new Set(["workspace"]) })
    const wrapper = mountComplete(ctx)
    const buttons = wrapper.findAll(".ant-btn-stub")
    const ctaBtn = buttons.find((b) => b.text().includes("Open workspace"))
    expect(ctaBtn).toBeTruthy()
  })

  it("calls ctx.goToItem('workspace') when the Open workspace CTA is clicked", async () => {
    const ctx = makeCtx({ completed: new Set(["workspace"]) })
    const wrapper = mountComplete(ctx)
    const buttons = wrapper.findAll(".ant-btn-stub")
    const ctaBtn = buttons.find((b) => b.text().includes("Open workspace"))
    await ctaBtn?.trigger("click")
    expect(ctx.goToItem).toHaveBeenCalledWith("workspace")
  })

  it("does not render a row CTA button for skipped (not completed) steps", () => {
    const ctx = makeCtx({ completed: new Set(["workspace"]) })
    const wrapper = mountComplete(ctx)
    const text = wrapper.text()
    // invites/source/agent were skipped — their CTA labels should not appear
    expect(text).not.toContain("View team")
    expect(text).not.toContain("Open dataset")
    expect(text).not.toContain("Open agent")
  })
})
