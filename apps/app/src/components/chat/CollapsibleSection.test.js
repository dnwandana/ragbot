// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { mount } from "@vue/test-utils"
import CollapsibleSection from "@/components/chat/CollapsibleSection.vue"

const mountSection = (props = {}) =>
  mount(CollapsibleSection, {
    props: { label: "Input", ...props },
    slots: { default: "<pre class='body'>code</pre>" },
    global: { stubs: { ChevronRight: true } },
  })

describe("CollapsibleSection", () => {
  it("starts shut and hides its body", () => {
    const wrapper = mountSection({ count: "5 lines" })

    expect(wrapper.find(".body").exists()).toBe(false)
    expect(wrapper.find("button").attributes("aria-expanded")).toBe("false")
    expect(wrapper.text()).toContain("5 lines")
  })

  it("opens the body on a click and shuts it again", async () => {
    const wrapper = mountSection()

    await wrapper.find("button").trigger("click")
    expect(wrapper.find(".body").exists()).toBe(true)
    expect(wrapper.find("button").attributes("aria-expanded")).toBe("true")

    await wrapper.find("button").trigger("click")
    expect(wrapper.find(".body").exists()).toBe(false)
  })

  it("tints the label and the chip for an error", () => {
    const wrapper = mountSection({ count: "KeyError", variant: "error" })

    expect(wrapper.find(".collapsible-section__label").classes()).toContain("is-error")
    expect(wrapper.find(".collapsible-section__count").classes()).toContain("is-error")
  })

  it("shows a caret and refuses to open while the cell runs", async () => {
    const wrapper = mountSection({ live: true })

    expect(wrapper.find(".collapsible-section__caret").exists()).toBe(true)
    expect(wrapper.find("button").attributes("disabled")).toBeDefined()

    await wrapper.find("button").trigger("click")
    expect(wrapper.find(".body").exists()).toBe(false)
  })
})
