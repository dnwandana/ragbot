// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { mount } from "@vue/test-utils"
import MarkdownRenderer from "@/components/chat/MarkdownRenderer.vue"

describe("MarkdownRenderer citation gating", () => {
  it("chips every marker when citationNumbers is null (streaming)", () => {
    const wrapper = mount(MarkdownRenderer, { props: { text: "See [1] and [7]." } })
    expect(wrapper.html()).toContain('data-cite="1"')
    expect(wrapper.html()).toContain('data-cite="7"')
  })

  it("renders an unresolved marker as plain text", () => {
    const wrapper = mount(MarkdownRenderer, {
      props: { text: "See [1] and [7].", citationNumbers: [1, 2, 3, 4, 5] },
    })
    expect(wrapper.html()).toContain('data-cite="1"')
    expect(wrapper.html()).not.toContain('data-cite="7"')
  })

  it("renders no chips for source excerpts (empty citationNumbers)", () => {
    const wrapper = mount(MarkdownRenderer, {
      props: { text: "[1] W. Dai, b-money.", citationNumbers: [] },
    })
    expect(wrapper.html()).not.toContain("cite-ref")
    expect(wrapper.find(".md-prose").text()).toContain("[1]")
  })

  it("emits cite with the parsed number when a chip is clicked", async () => {
    const wrapper = mount(MarkdownRenderer, { props: { text: "See [1]." } })
    await wrapper.find(".cite-ref").trigger("click")
    expect(wrapper.emitted("cite")[0]).toEqual([1])
  })
})
