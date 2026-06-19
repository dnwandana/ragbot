// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { mount } from "@vue/test-utils"
import SourceCitations from "@/components/chat/SourceCitations.vue"

// a-button stub: renders its default slot inside a native <button> and
// forwards click events so tests can trigger them normally.
const AButtonStub = {
  name: "AButton",
  props: {
    type: { type: String, default: "default" },
    size: { type: String, default: "default" },
    title: { type: String, default: "" },
  },
  template: `<button class="a-button-stub" :title="title" @click="$emit('click', $event)"><slot /></button>`,
  emits: ["click"],
}

const GLOBAL = {
  stubs: {
    "a-button": AButtonStub,
  },
}

function mountCitations(sources = []) {
  return mount(SourceCitations, {
    props: { sources },
    global: GLOBAL,
  })
}

describe("SourceCitations rendering", () => {
  it("renders nothing when sources is empty", () => {
    const wrapper = mountCitations([])
    expect(wrapper.find(".source-citations").exists()).toBe(false)
  })

  it("renders the citations toggle when sources has entries", () => {
    const wrapper = mountCitations([{ id: "c1" }, { id: "c2" }])
    expect(wrapper.find(".source-citations").exists()).toBe(true)
    expect(wrapper.find(".a-button-stub").exists()).toBe(true)
  })

  it("displays the source count in the toggle label for a single source", () => {
    const wrapper = mountCitations([{ id: "c1" }])
    expect(wrapper.find(".a-button-stub").text()).toContain("1 source")
  })

  it("displays the source count in the toggle label for multiple sources", () => {
    const wrapper = mountCitations([{ id: "c1" }, { id: "c2" }, { id: "c3" }])
    expect(wrapper.find(".a-button-stub").text()).toContain("3 sources")
  })
})

describe("SourceCitations toggle interaction", () => {
  it("emits 'open-panel' when the toggle a-button is clicked", async () => {
    const wrapper = mountCitations([{ id: "c1" }])
    await wrapper.find(".a-button-stub").trigger("click")
    expect(wrapper.emitted("open-panel")).toBeTruthy()
    expect(wrapper.emitted("open-panel")).toHaveLength(1)
  })

  it("emits 'open-panel' on every click", async () => {
    const wrapper = mountCitations([{ id: "c1" }])
    await wrapper.find(".a-button-stub").trigger("click")
    await wrapper.find(".a-button-stub").trigger("click")
    expect(wrapper.emitted("open-panel")).toHaveLength(2)
  })
})
