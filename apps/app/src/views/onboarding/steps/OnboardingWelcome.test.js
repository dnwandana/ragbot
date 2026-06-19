// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { mount } from "@vue/test-utils"
import { reactive } from "vue"
import OnboardingWelcome from "@/views/onboarding/steps/OnboardingWelcome.vue"

/**
 * Stub for a-button — renders a <button> with a data-type attribute so
 * assertions can verify the Ant button type and trigger click events.
 */
const AButtonStub = {
  props: ["type", "size", "disabled", "loading"],
  template: `<button class="ant-btn-stub" :data-type="type" :disabled="disabled"><slot /></button>`,
}

const GLOBAL = {
  stubs: { "a-button": AButtonStub },
}

const STEPS = [
  { key: "workspace", label: "Create your workspace" },
  { key: "invites", label: "Invite your team" },
  { key: "source", label: "Add a knowledge source" },
  { key: "agent", label: "Create your first agent" },
]

/**
 * Build a reactive fake of the onboarding shell context.
 * @returns {object} Reactive ctx with stubbed shell actions
 */
function makeCtx() {
  return reactive({
    steps: STEPS,
    next: vi.fn(),
  })
}

/**
 * Mount OnboardingWelcome with the given ctx.
 * @param {object} [ctx] - Shell ctx override
 * @returns {import("@vue/test-utils").VueWrapper}
 */
function mountWelcome(ctx = makeCtx()) {
  return mount(OnboardingWelcome, {
    props: { ctx },
    global: GLOBAL,
  })
}

describe("OnboardingWelcome", () => {
  it("renders the welcome heading", () => {
    const wrapper = mountWelcome()
    expect(wrapper.find(".ob-title").text()).toContain("get you set up")
  })

  it("renders step labels in the step list", () => {
    const wrapper = mountWelcome()
    const text = wrapper.text()
    expect(text).toContain("Create your workspace")
    expect(text).toContain("Invite your team")
    expect(text).toContain("Add a knowledge source")
    expect(text).toContain("Create your first agent")
  })

  it("renders the Get started CTA as an a-button", () => {
    const wrapper = mountWelcome()
    expect(wrapper.find(".ant-btn-stub").exists()).toBe(true)
    expect(wrapper.find(".ant-btn-stub").text()).toContain("Get started")
  })

  it("renders the Get started a-button with type='primary'", () => {
    const wrapper = mountWelcome()
    expect(wrapper.find(".ant-btn-stub").attributes("data-type")).toBe("primary")
  })

  it("calls ctx.next() when the Get started button is clicked", async () => {
    const ctx = makeCtx()
    const wrapper = mountWelcome(ctx)
    await wrapper.find(".ant-btn-stub").trigger("click")
    expect(ctx.next).toHaveBeenCalledOnce()
  })
})
