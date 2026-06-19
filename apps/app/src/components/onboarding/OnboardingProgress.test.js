// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { mount } from "@vue/test-utils"
import OnboardingProgress from "./OnboardingProgress.vue"

/** Stub for a-steps — exposes :current as a data-current attribute and renders slot content */
const AStepsStub = {
  props: ["current", "size"],
  template: `<div class="ant-steps" :data-current="current"><slot /></div>`,
}

/** Stub for a-step — renders title as text */
const AStepStub = {
  props: ["title"],
  template: `<div class="ant-step" :data-title="title">{{ title }}</div>`,
}

const GLOBAL = {
  stubs: {
    "a-steps": AStepsStub,
    "a-step": AStepStub,
  },
}

const STEPS = [
  { key: "welcome", label: "Welcome" },
  { key: "workspace", label: "Workspace" },
  { key: "source", label: "Source" },
  { key: "agent", label: "Agent" },
  { key: "invite", label: "Invite" },
]

const DONE_NONE = new Set()
const DONE_FIRST = new Set([0])

/**
 * Mounts OnboardingProgress with sensible defaults.
 * @param {Partial<{steps: Array, current: number, done: Set}>} props
 * @returns {import("@vue/test-utils").VueWrapper}
 */
function mountProgress(props = {}) {
  return mount(OnboardingProgress, {
    props: {
      steps: STEPS,
      current: 0,
      done: DONE_NONE,
      ...props,
    },
    global: GLOBAL,
  })
}

describe("OnboardingProgress", () => {
  it("renders an a-steps component", () => {
    const wrapper = mountProgress()
    expect(wrapper.find(".ant-steps").exists()).toBe(true)
  })

  it("passes :current to a-steps", () => {
    const wrapper = mountProgress({ current: 2 })
    expect(wrapper.find(".ant-steps").attributes("data-current")).toBe("2")
  })

  it("renders one a-step per step entry", () => {
    const wrapper = mountProgress()
    expect(wrapper.findAll(".ant-step")).toHaveLength(STEPS.length)
  })

  it("passes the step label as the title of each a-step", () => {
    const wrapper = mountProgress()
    const titles = wrapper.findAll(".ant-step").map((el) => el.attributes("data-title"))
    expect(titles).toEqual(STEPS.map((s) => s.label))
  })

  it("marks the correct step as current when current=0", () => {
    const wrapper = mountProgress({ current: 0 })
    expect(wrapper.find(".ant-steps").attributes("data-current")).toBe("0")
  })

  it("marks the correct step as current when current=3", () => {
    const wrapper = mountProgress({ current: 3 })
    expect(wrapper.find(".ant-steps").attributes("data-current")).toBe("3")
  })

  it("still accepts the done prop without errors (prop contract preserved)", () => {
    const wrapper = mountProgress({ current: 1, done: DONE_FIRST })
    expect(wrapper.find(".ant-steps").exists()).toBe(true)
  })
})
