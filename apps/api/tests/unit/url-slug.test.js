import { urlToFilename } from "../../src/utils/url-slug.js"

describe("urlToFilename", () => {
  it("should slug host and path", () => {
    expect(urlToFilename("https://stellar.org/learn/consensus")).toBe(
      "stellar-org-learn-consensus.md",
    )
  })

  it("should slug a root URL without a trailing dash", () => {
    expect(urlToFilename("https://stellar.org/")).toBe("stellar-org.md")
  })

  it("should include the query string but not the hash", () => {
    expect(urlToFilename("https://stellar.org/learn?foo=bar#section")).toBe(
      "stellar-org-learn-foo-bar.md",
    )
  })

  it("should give URLs that differ only by query string distinct filenames", () => {
    expect(urlToFilename("https://stellar.org/search?q=a")).not.toBe(
      urlToFilename("https://stellar.org/search?q=b"),
    )
  })

  it("should map a URL with a query string to a stable, deterministic filename (re-scrapes are not deduped)", () => {
    expect(urlToFilename("https://stellar.org/search?q=consensus")).toBe(
      "stellar-org-search-q-consensus.md",
    )
  })

  it("should omit the port from the slug", () => {
    expect(urlToFilename("https://example.com:8080/page")).toBe("example-com-page.md")
  })

  it("should truncate long paths to 200 chars without a trailing dash", () => {
    const longPath = "a".repeat(50) + "/" + "b".repeat(300)
    const result = urlToFilename(`https://example.com/${longPath}`)
    const slug = result.replace(/\.md$/, "")
    expect(slug.length).toBeLessThanOrEqual(200)
    expect(slug.endsWith("-")).toBe(false)
    expect(result.endsWith(".md")).toBe(true)
  })

  it("should truncate correctly when the query string alone causes the overflow", () => {
    const longQuery = "?a=" + "x".repeat(250)
    const result = urlToFilename(`https://example.com/page${longQuery}`)
    const slug = result.replace(/\.md$/, "")
    expect(slug.length).toBeLessThanOrEqual(200)
    expect(slug.endsWith("-")).toBe(false)
    expect(result.endsWith(".md")).toBe(true)
  })

  it("should fall back to 'source' when host and path slugify to empty", () => {
    expect(urlToFilename("https://...")).toBe("source.md")
  })
})
