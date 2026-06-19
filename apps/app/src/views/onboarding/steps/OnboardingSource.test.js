// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { mount } from "@vue/test-utils"
import { reactive } from "vue"
import OnboardingSource from "@/views/onboarding/steps/OnboardingSource.vue"

/**
 * Ant Design Vue pass-through stubs for jsdom.
 * AInput mirrors the v-model:value contract used by a-input.
 */
const AInput = {
  props: ["value", "placeholder", "class"],
  emits: ["update:value", "pressEnter", "change"],
  template: `<input
    class="ant-input"
    :placeholder="placeholder"
    :value="value"
    @input="$emit('update:value', $event.target.value); $emit('change', $event)"
    @keydown.enter.prevent="$emit('pressEnter')"
  />`,
}

/** a-textarea stub — mirrors v-model:value + @change contract */
const ATextarea = {
  props: ["value", "placeholder", "rows", "maxlength", "class"],
  emits: ["update:value", "change"],
  template: `<textarea
    class="ant-input"
    :placeholder="placeholder"
    :rows="rows"
    :maxlength="maxlength"
    :value="value"
    @input="$emit('update:value', $event.target.value); $emit('change', $event)"
  />`,
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
    skip: vi.fn(),
    runAction: vi.fn(),
  })
}

/**
 * Mount OnboardingSource in the "name" phase (default when no files).
 * @param {object} [extraProps] - Additional prop overrides
 * @param {object} [ctx] - Shell ctx to inject (defaults to a fresh fake)
 * @returns {import("@vue/test-utils").VueWrapper}
 */
function mountSource(extraProps = {}, ctx = makeCtx()) {
  return mount(OnboardingSource, {
    props: {
      ctx,
      datasetName: "",
      datasetDescription: "",
      files: [],
      ...extraProps,
    },
    global: GLOBAL,
  })
}

describe("OnboardingSource — name phase", () => {
  it("renders the dataset-name field as an a-input (ant-input)", () => {
    const wrapper = mountSource()
    // Phase A: the name-phase fields should use a-input (stubbed → .ant-input)
    const inputs = wrapper.findAll(".ant-input")
    expect(inputs.length).toBeGreaterThanOrEqual(1)
    expect(inputs[0].attributes("placeholder")).toBe("Company knowledge")
  })

  it("emits update:datasetName when typing in the name a-input", async () => {
    const wrapper = mountSource()
    const nameInput = wrapper.findAll(".ant-input")[0]
    nameInput.element.value = "HR Policies"
    await nameInput.trigger("input")
    expect(wrapper.emitted("update:datasetName")?.at(-1)).toEqual(["HR Policies"])
  })

  it("Continue button is disabled when datasetName is empty", () => {
    const wrapper = mountSource({ datasetName: "" })
    const btn = wrapper.findAll(".ob-btn-primary").find((b) => b.text().includes("Continue"))
    expect(btn?.attributes("disabled")).toBeDefined()
  })

  it("Continue button is enabled and advances to files phase when datasetName is set", async () => {
    const wrapper = mountSource({ datasetName: "Acme Docs" })
    const btn = wrapper.findAll(".ob-btn-primary").find((b) => b.text().includes("Continue"))
    expect(btn?.attributes("disabled")).toBeUndefined()
    await btn?.trigger("click")
    // After clicking Continue the files-phase header should appear
    expect(wrapper.find(".ob-title").text()).toBe("Add files to your dataset")
  })
})

describe("OnboardingSource — files phase", () => {
  /** Seed file used to force the component into files phase on mount. */
  const SEED_FILE = {
    id: "f1",
    name: "guide.pdf",
    size: 1024,
    status: "ready",
    type: "file",
    raw: {},
  }

  /**
   * Mount directly in the files phase by seeding a ready file so phase === "files".
   * @param {object} [extraProps]
   * @param {object} [ctx]
   * @returns {import("@vue/test-utils").VueWrapper}
   */
  function mountFilesPhase(extraProps = {}, ctx = makeCtx()) {
    return mount(OnboardingSource, {
      props: {
        ctx,
        datasetName: "Acme Docs",
        datasetDescription: "",
        files: [SEED_FILE],
        ...extraProps,
      },
      global: GLOBAL,
    })
  }

  it("renders the URL input field as an a-input (ant-input)", () => {
    const wrapper = mountFilesPhase()
    // The URL field should now be an a-input stub → .ant-input
    const inputs = wrapper.findAll(".ant-input")
    expect(inputs.length).toBeGreaterThanOrEqual(1)
  })

  it("emits update:files with a new URL entry when Add URL is clicked with a valid URL", async () => {
    // Mount with only the seed file so it enters files phase; test adds a URL on top
    const wrapper = mountFilesPhase()
    const urlInput = wrapper.find(".ant-input")
    await urlInput.setValue("https://acme.com/docs")
    // Find the "Add URL" button (ob-btn-secondary in the files phase, not "Skip for now")
    const addUrlBtn = wrapper.findAll(".ob-btn-secondary").find((b) => b.text() === "Add URL")
    await addUrlBtn?.trigger("click")
    const emitted = wrapper.emitted("update:files")
    expect(emitted).toBeTruthy()
    const newFiles = emitted?.at(-1)?.[0]
    expect(newFiles?.some((f) => f.type === "url" && f.name === "https://acme.com/docs")).toBe(true)
  })

  it("shows a URL validation error when an invalid URL is submitted", async () => {
    const wrapper = mountFilesPhase()
    const urlInput = wrapper.find(".ant-input")
    await urlInput.setValue("not-a-url!!!")
    const addUrlBtn = wrapper.findAll(".ob-btn-secondary").find((b) => b.text() === "Add URL")
    await addUrlBtn?.trigger("click")
    expect(wrapper.find(".ob-error-text").exists()).toBe(true)
  })

  it("keeps the custom dropzone — ob-dropzone class must exist", () => {
    const wrapper = mountFilesPhase()
    expect(wrapper.find(".ob-dropzone").exists()).toBe(true)
  })

  it("adds is-drag class to dropzone while dragging", async () => {
    const wrapper = mountFilesPhase()
    await wrapper.find(".ob-dropzone").trigger("dragover")
    expect(wrapper.find(".ob-dropzone").classes()).toContain("is-drag")
  })

  it("Continue button calls ctx.runAction('source') when ready files exist", async () => {
    const ctx = makeCtx()
    const wrapper = mountFilesPhase({}, ctx)
    const btn = wrapper.findAll(".ob-btn-primary").find((b) => b.text().includes("Continue with"))
    await btn?.trigger("click")
    expect(ctx.runAction).toHaveBeenCalledWith("source")
  })

  it("Continue button is disabled when no ready files exist", () => {
    const wrapper = mountFilesPhase({
      files: [{ id: "f1", name: "bad.xyz", size: 9999, status: "error", type: "file", raw: null }],
    })
    const btn = wrapper.findAll(".ob-btn-primary").find((b) => b.text().includes("Continue with"))
    expect(btn?.attributes("disabled")).toBeDefined()
  })
})
