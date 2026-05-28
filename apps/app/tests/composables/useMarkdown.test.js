import { describe, it, expect } from "vitest"
import { useMarkdown } from "@/composables/useMarkdown"

const { render } = useMarkdown()

describe("useMarkdown", () => {
  describe("markdown rendering", () => {
    it("renders bold", () => {
      expect(render("**text**")).toContain("<strong>text</strong>")
    })

    it("renders italic", () => {
      expect(render("_text_")).toContain("<em>text</em>")
    })

    it("renders inline code", () => {
      expect(render("`code`")).toContain("<code>code</code>")
    })

    it("renders code block", () => {
      const result = render("```\ncode\n```")
      expect(result).toContain("<pre>")
      expect(result).toContain("<code>")
      expect(result).toContain("code")
    })

    it("renders ordered list", () => {
      const result = render("1. item")
      expect(result).toContain("<ol>")
      expect(result).toContain("<li>item</li>")
    })

    it("renders unordered list", () => {
      const result = render("- item")
      expect(result).toContain("<ul>")
      expect(result).toContain("<li>item</li>")
    })

    it("adds target and rel attributes to links", () => {
      const result = render("[text](https://example.com)")
      expect(result).toContain('target="_blank"')
      expect(result).toContain('rel="noopener noreferrer"')
    })
  })

  describe("XSS sanitization", () => {
    it("strips script tags", () => {
      expect(render("<script>alert(1)</script>")).not.toContain("<script")
    })

    it("strips onerror event attributes", () => {
      expect(render('<img onerror="alert(1)">')).not.toContain("onerror")
    })

    it("strips javascript: href", () => {
      expect(render("[x](javascript:alert(1))")).not.toContain("javascript:")
    })
  })

  describe("edge cases", () => {
    it("returns empty string for empty input", () => {
      expect(render("")).toBe("")
    })

    it("returns empty string for null input", () => {
      expect(render(null)).toBe("")
    })
  })
})
