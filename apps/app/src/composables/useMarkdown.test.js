// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { useMarkdown } from "@/composables/useMarkdown"

describe("useMarkdown.renderChunk", () => {
  const { renderChunk } = useMarkdown()

  it("renders markdown formatting", () => {
    const html = renderChunk("# Title\n\nSome **bold** text.")
    expect(html).toContain("<h1")
    expect(html).toContain("<strong>bold</strong>")
  })

  it("does NOT turn [1] into a citation chip", () => {
    const html = renderChunk("See clause [1] for details.")
    expect(html).not.toContain("cite-ref")
    expect(html).toContain("[1]")
  })

  it("sanitizes dangerous markup", () => {
    const html = renderChunk("<img src=x onerror=alert(1)>\n\n<script>alert(2)</script>")
    expect(html).not.toContain("onerror")
    expect(html).not.toContain("<script>")
  })

  it("adds safe attrs to links", () => {
    const html = renderChunk("[link](https://example.com)")
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
  })

  it("returns empty string for null/empty", () => {
    expect(renderChunk(null)).toBe("")
    expect(renderChunk("")).toBe("")
  })
})

describe("useMarkdown.render citation gating", () => {
  const { render } = useMarkdown()

  it("chips every [n] when no citation list is given", () => {
    const html = render("See [1] and [7].")
    expect(html).toContain('data-cite="1"')
    expect(html).toContain('data-cite="7"')
  })

  it("chips only numbers backed by a source, leaving others literal", () => {
    const html = render("See [1] and [7].", [1, 2, 3, 4, 5])
    expect(html).toContain('data-cite="1"')
    expect(html).not.toContain('data-cite="7"')
    expect(html).toContain("[7]")
  })

  it("renders no chips when the citation list is empty", () => {
    const html = render("Reference [1] W. Dai, [2] H. Massias.", [])
    expect(html).not.toContain("cite-ref")
    expect(html).toContain("[1]")
    expect(html).toContain("[2]")
  })

  it("keeps the space before a marker that stays literal", () => {
    expect(render("APAC grew [1], ahead of EMEA.", [])).toContain("APAC grew [1], ahead")
  })
})

describe("useMarkdown.render citation stripping", () => {
  const { render } = useMarkdown()
  const strip = { stripCitations: true }

  it("removes a marker and the space before it", () => {
    const html = render("APAC grew [1], ahead of EMEA.", null, strip)
    expect(html).toContain("APAC grew, ahead of EMEA.")
    expect(html).not.toContain("[1]")
    expect(html).not.toContain("cite-ref")
  })

  it("removes a marker that has no space before it", () => {
    expect(render("APAC grew[1].", null, strip)).toContain("APAC grew.")
  })

  it("keeps bracketed numbers inside a code fence", () => {
    const html = render("```js\nconst x = arr[0]\n```", null, strip)
    expect(html).toContain("arr[0]")
  })

  it("keeps a markdown link intact", () => {
    const html = render("See [1](https://example.com) now.", null, strip)
    expect(html).toContain('href="https://example.com"')
  })

  it("leaves markers in place when stripping is off", () => {
    expect(render("APAC grew [1].", null, { stripCitations: false })).toContain("cite-ref")
  })
})
