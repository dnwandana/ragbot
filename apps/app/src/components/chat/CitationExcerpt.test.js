// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { mount } from "@vue/test-utils"
import CitationExcerpt from "@/components/chat/CitationExcerpt.vue"

const filler = (n, prefix = "word") =>
  Array.from({ length: n }, (_, i) => `${prefix}${i}`).join(" ")
const passage = "Japan grew 13% in April."
// The words after the passage use another prefix, so "word0 " shows only when the start is visible.
const long = `${filler(80)} ${passage} ${filler(80, "tail")}`
const at = (text) => ({
  text,
  start: text.indexOf(passage),
  end: text.indexOf(passage) + passage.length,
})
const toggle = (w) => w.find("button.citation-excerpt__toggle")

describe("CitationExcerpt", () => {
  it("shows the window with the mark, and a toggle when clipped", () => {
    const w = mount(CitationExcerpt, { props: at(long) })
    expect(w.find("mark.citation-excerpt__mark").text()).toBe(passage)
    expect(w.text()).not.toContain("word0 ")
    expect(toggle(w).text()).toBe("Show full excerpt")
    expect(toggle(w).attributes("type")).toBe("button")
  })

  it("expands to the full text with the same mark, and collapses again", async () => {
    const w = mount(CitationExcerpt, { props: at(long) })
    await toggle(w).trigger("click")
    expect(w.text()).toContain("word0 ")
    expect(w.find("mark.citation-excerpt__mark").text()).toBe(passage)
    expect(toggle(w).text()).toBe("Show less")
    await toggle(w).trigger("click")
    expect(toggle(w).text()).toBe("Show full excerpt")
  })

  it("shows a short text without offsets in full, with no toggle and no mark", () => {
    const w = mount(CitationExcerpt, { props: { text: "Old excerpt.", start: null, end: null } })
    expect(w.text()).toContain("Old excerpt.")
    expect(toggle(w).exists()).toBe(false)
    expect(w.find("mark").exists()).toBe(false)
  })

  it("shows the lead of a long text without offsets, with a toggle and no mark", () => {
    const w = mount(CitationExcerpt, { props: { text: filler(200) } })
    expect(w.text()).toMatch(/…/)
    expect(w.find("mark").exists()).toBe(false)
    expect(toggle(w).text()).toBe("Show full excerpt")
  })

  it("shows no toggle when the window is the full text", () => {
    expect(toggle(mount(CitationExcerpt, { props: at(passage) })).exists()).toBe(false)
  })

  // Review Focus: offsets that do not fit the text.
  it.each([
    [0, 9999],
    [5, 5],
    [-1, 4],
    [1.5, 4],
  ])("treats the offsets %s..%s as missing", (start, end) => {
    const w = mount(CitationExcerpt, { props: { text: "Old excerpt.", start, end } })
    expect(w.text()).toContain("Old excerpt.")
    expect(w.find("mark").exists()).toBe(false)
  })

  it("renders a [n] in the chunk as plain text", () => {
    const w = mount(CitationExcerpt, { props: { text: "See [1] W. Dai." } })
    expect(w.find(".cite-ref").exists()).toBe(false)
    expect(w.text()).toContain("[1]")
  })
})
