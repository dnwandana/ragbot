// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
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

describe("MarkdownRenderer transform", () => {
  it("shows the output of the transform", () => {
    const wrapper = mount(MarkdownRenderer, {
      props: {
        text: "Alpha beta.",
        transform: (html) => html.replace("beta", "<mark>beta</mark>"),
      },
    })
    expect(wrapper.find("mark").text()).toBe("beta")
  })

  it("gives the transform HTML that is already sanitized", () => {
    let seen = ""
    mount(MarkdownRenderer, {
      props: { text: "<img src=x onerror=alert(1)> Text.", transform: (html) => (seen = html) },
    })
    expect(seen).not.toContain("onerror")
  })

  it("does not change the HTML without a transform", () => {
    const plain = mount(MarkdownRenderer, { props: { text: "Alpha **beta**." } })
    const same = mount(MarkdownRenderer, { props: { text: "Alpha **beta**.", transform: null } })
    expect(same.html()).toBe(plain.html())
  })

  it("does not call the transform for an empty text", () => {
    const transform = vi.fn((html) => html)
    mount(MarkdownRenderer, { props: { text: "", transform } })
    expect(transform).not.toHaveBeenCalled()
  })
})
