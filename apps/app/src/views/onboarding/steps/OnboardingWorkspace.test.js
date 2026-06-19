// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { mount } from "@vue/test-utils"
import { reactive } from "vue"
import OnboardingWorkspace from "@/views/onboarding/steps/OnboardingWorkspace.vue"

/**
 * Stub for a-input: renders a real <input> so value/event assertions work in jsdom.
 * Mirrors the AInput stub convention used in WorkspaceFormModal.test.js.
 */
const AInput = {
  props: ["value"],
  emits: ["update:value", "change"],
  template: `<input class="a-input-stub" :value="value" @input="$emit('update:value', $event.target.value)" />`,
}

/**
 * Stub for a-textarea: renders a real <textarea> so value/event assertions work in jsdom.
 */
const ATextarea = {
  props: ["value", "rows", "maxlength"],
  emits: ["update:value", "change"],
  template: `<textarea class="a-textarea-stub" :value="value" @input="$emit('update:value', $event.target.value)" />`,
}

const GLOBAL = {
  stubs: {
    "a-input": AInput,
    "a-textarea": ATextarea,
  },
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
    runAction: vi.fn(),
  })
}

/**
 * Mount OnboardingWorkspace with default or overridden props.
 * @param {object} [overrides] - Prop overrides
 * @param {object} [ctx] - Shell ctx to inject (defaults to a fresh fake)
 * @returns {import("@vue/test-utils").VueWrapper} The mounted wrapper
 */
function mountWorkspace(overrides = {}, ctx = makeCtx()) {
  return mount(OnboardingWorkspace, {
    props: {
      ctx,
      workspaceName: "",
      workspaceDescription: "",
      ...overrides,
    },
    global: GLOBAL,
  })
}

describe("OnboardingWorkspace", () => {
  it("renders the workspace name field as a-input", () => {
    const wrapper = mountWorkspace()
    expect(wrapper.find(".a-input-stub").exists()).toBe(true)
  })

  it("renders the workspace description field as a-textarea", () => {
    const wrapper = mountWorkspace()
    expect(wrapper.find(".a-textarea-stub").exists()).toBe(true)
  })

  it("reflects the workspaceName prop as the name field value", () => {
    const wrapper = mountWorkspace({ workspaceName: "Acme Corp" })
    expect(wrapper.find(".a-input-stub").element.value).toBe("Acme Corp")
  })

  it("reflects the workspaceDescription prop as the description field value", () => {
    const wrapper = mountWorkspace({ workspaceDescription: "Our main workspace" })
    expect(wrapper.find(".a-textarea-stub").element.value).toBe("Our main workspace")
  })

  it("emits update:workspaceName and clears the error on name input", async () => {
    const ctx = makeCtx()
    const wrapper = mountWorkspace({}, ctx)
    const input = wrapper.find(".a-input-stub")
    input.element.value = "New Workspace"
    await input.trigger("input")
    expect(wrapper.emitted("update:workspaceName")?.at(-1)).toEqual(["New Workspace"])
    expect(ctx.setError).toHaveBeenCalledWith("workspace", null)
  })

  it("emits update:workspaceDescription on textarea input", async () => {
    const wrapper = mountWorkspace()
    const ta = wrapper.find(".a-textarea-stub")
    ta.element.value = "A short description"
    await ta.trigger("input")
    expect(wrapper.emitted("update:workspaceDescription")?.at(-1)).toEqual(["A short description"])
  })

  it("calls ctx.runAction('workspace') when Create workspace is clicked with a valid name", async () => {
    const ctx = makeCtx()
    const wrapper = mountWorkspace({ workspaceName: "Valid Name" }, ctx)
    await wrapper.find(".ob-btn-primary").trigger("click")
    expect(ctx.runAction).toHaveBeenCalledWith("workspace")
  })

  it("disables the Create workspace button when name is blank", () => {
    const wrapper = mountWorkspace({ workspaceName: "" })
    expect(wrapper.find(".ob-btn-primary").attributes("disabled")).toBeDefined()
  })

  it("shows error text when ctx.errors.workspace is set", () => {
    const ctx = makeCtx()
    ctx.errors.workspace = "Name is required"
    const wrapper = mountWorkspace({}, ctx)
    expect(wrapper.find(".ob-error-text").exists()).toBe(true)
    expect(wrapper.find(".ob-error-text").text()).toContain("Name is required")
  })

  it("calls ctx.back() when Back is clicked", async () => {
    const ctx = makeCtx()
    const wrapper = mountWorkspace({}, ctx)
    await wrapper.find(".ob-btn-ghost").trigger("click")
    expect(ctx.back).toHaveBeenCalled()
  })
})
