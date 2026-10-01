// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { useMarkdown } from "@/composables/useMarkdown"
import {
  CONTEXT_CHARS,
  LEAD_CHARS,
  markPassage,
  selectLead,
  selectWindow,
} from "./citation-window.js"

const { render } = useMarkdown()
const md = (s) => render(s, [])
const mark = (text, passage) =>
  markPassage({ html: md(text), passageMarkdown: passage, render: md })
const marked = (html) => {
  const t = document.createElement("template")
  t.innerHTML = html
  return [...t.content.querySelectorAll("mark.citation-excerpt__mark")].map((m) => m.textContent)
}

const words = (from, count) =>
  Array.from({ length: count }, (_, i) => `w${String(from + i).padStart(3, "0")}`).join(" ")
const table = ["| Country | Q2 |", "| --- | --- |", "| Japan | 2.32M |", "| Korea | 0.80M |"].join(
  "\n",
)
const around = (text, passage) =>
  selectWindow({
    text,
    start: text.indexOf(passage),
    end: text.indexOf(passage) + passage.length,
  })

describe("selectWindow", () => {
  it("never cuts a table, and keeps the heading above it", () => {
    const text = `${words(0, 60)}\n\n## APAC revenue\n\n${table}\n\n${words(100, 60)}`
    expect(around(text, "| Japan | 2.32M |")).toEqual({
      markdown: `## APAC revenue\n\n${table}`,
      clipped: true,
    })
  })

  it("never cuts a list", () => {
    const list = "- Gross margin held at 71%.\n- Costs fell.\n- Hiring paused."
    const text = `${words(0, 60)}\n\n${list}`
    expect(around(text, "Costs fell.").markdown).toBe(list)
  })

  it("cuts a long paragraph on word boundaries, with … on each cut side", () => {
    const text = `${words(0, 100)} Japan grew 13% in April. ${words(200, 100)}`
    const { markdown, clipped } = around(text, "Japan grew 13% in April.")
    expect(clipped).toBe(true)
    expect(markdown).toMatch(/^…w\d{3} /)
    expect(markdown).toMatch(/ w\d{3}…$/)
    expect(markdown).toContain("Japan grew 13% in April.")
    expect(markdown.length).toBeLessThanOrEqual(
      "Japan grew 13% in April.".length + 2 * CONTEXT_CHARS + 2,
    )
  })

  it("drops the heading when the paragraph below it is cut at its start", () => {
    const text = `## Notes\n\n${words(0, 100)} Japan grew 13%.`
    expect(around(text, "Japan grew 13%.").markdown.startsWith("…")).toBe(true)
  })

  it("takes every block from start to end", () => {
    const text = `First block.\n\nSecond block.\n\nThird block.`
    const start = text.indexOf("First")
    const end = text.indexOf("Second block.") + "Second block.".length
    expect(selectWindow({ text, start, end }).markdown).toBe("First block.\n\nSecond block.")
  })

  it("keeps a fenced code block with a blank line inside as one block", () => {
    const code = "```py\nx = 1\n\ny = 2\n```"
    const text = `${words(0, 60)}\n\n${code}`
    expect(around(text, "y = 2").markdown).toBe(code)
  })

  it("returns the full text, not clipped, for a short text", () => {
    expect(around("Japan grew 13%.", "Japan")).toEqual({
      markdown: "Japan grew 13%.",
      clipped: false,
    })
  })
})

describe("selectLead", () => {
  it("takes whole blocks up to the limit", () => {
    const text = `${"a".repeat(200)}\n\n${"b".repeat(200)}`
    expect(selectLead(text)).toEqual({ markdown: "a".repeat(200), clipped: true })
  })

  it("cuts a long first paragraph at a word boundary", () => {
    const { markdown, clipped } = selectLead(words(0, 200))
    expect(clipped).toBe(true)
    expect(markdown).toMatch(/w\d{3}…$/)
    expect(markdown.length).toBeLessThanOrEqual(LEAD_CHARS + 1)
  })

  it("keeps a long first table whole", () => {
    const long = [table, ...Array.from({ length: 30 }, (_, i) => `| Row ${i} | 1.00M |`)].join("\n")
    expect(selectLead(`${long}\n\nAfter.`).markdown).toBe(long)
  })

  it("returns a short text whole, not clipped", () => {
    expect(selectLead("Short.")).toEqual({ markdown: "Short.", clipped: false })
  })
})

describe("markPassage", () => {
  it("marks a passage across bold text", () => {
    const text = "Intro. APAC revenue increased **12%** to $4.1M. Outro."
    expect(marked(mark(text, "APAC revenue increased **12%** to $4.1M.")).join("")).toBe(
      "APAC revenue increased 12% to $4.1M.",
    )
  })

  it("marks each cell of a table row, and skips white space", () => {
    const text = "| Country | Q2 |\n| --- | --- |\n| Japan | 2.32M |\n| Korea | 0.80M |"
    expect(marked(mark(text, "| Japan | 2.32M |"))).toEqual(["Japan", "2.32M"])
  })

  it("extends the mark over punctuation in the same text node", () => {
    expect(marked(mark("Alpha. Japan grew 13%. Beta.", "Japan grew 13"))).toEqual([
      "Japan grew 13%.",
    ])
  })

  it("returns the HTML unchanged when the passage is not found", () => {
    const html = md("Alpha beta.")
    expect(markPassage({ html, passageMarkdown: "Gamma delta.", render: md })).toBe(html)
  })

  it("returns the HTML unchanged for an empty passage", () => {
    const html = md("Alpha beta.")
    expect(markPassage({ html, passageMarkdown: "", render: md })).toBe(html)
  })

  // Review Focus: text that looks like HTML inside the passage.
  it("never creates an element from HTML-like passage text", () => {
    const text = "Use &lt;img src=x onerror=alert(1)&gt; here. Japan grew."
    const out = mark(text, "Use &lt;img src=x onerror=alert(1)&gt; here.")
    const t = document.createElement("template")
    t.innerHTML = out
    expect(t.content.querySelector("img")).toBeNull()
    expect(marked(out).join("")).toContain("<img src=x onerror=alert(1)>")
  })
})
