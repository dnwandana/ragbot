import { redactUrl } from "../../src/utils/redact-url.js"

describe("redactUrl", () => {
  it("replaces the token in a public share URL", () => {
    expect(redactUrl("/api/share/abcDEF_123-xyz")).toBe("/api/share/[redacted]")
  })

  it("keeps the query string after the token", () => {
    expect(redactUrl("/api/share/abc?x=1")).toBe("/api/share/[redacted]?x=1")
  })

  it("does not change other URLs", () => {
    expect(redactUrl("/api/workspaces/w1/conversations/c1/share")).toBe(
      "/api/workspaces/w1/conversations/c1/share",
    )
  })

  it("returns an empty value unchanged", () => {
    expect(redactUrl(undefined)).toBeUndefined()
  })
})
