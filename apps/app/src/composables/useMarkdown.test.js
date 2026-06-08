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
