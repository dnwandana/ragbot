import { render } from "../../src/emails/render.js"

describe("email render", () => {
  it("verify-email substitutes all placeholders", () => {
    const html = render("verify-email", {
      full_name: "Alice Example",
      email: "alice@example.com",
      verification_url: "https://app.test/verify?token=abc",
      year: 2026,
    })
    expect(html).not.toContain("{{")
    expect(html).toContain("Alice Example")
    expect(html).toContain("alice@example.com")
    expect(html).toContain("https://app.test/verify?token=abc")
    expect(html).toContain("2026")
  })

  it("reset-password substitutes all placeholders", () => {
    const html = render("reset-password", {
      reset_url: "https://app.test/reset?token=xyz",
      year: 2026,
    })
    expect(html).not.toContain("{{")
    expect(html).toContain("https://app.test/reset?token=xyz")
    expect(html).toContain("2026")
  })

  it("workspace-invitation substitutes all placeholders", () => {
    const html = render("workspace-invitation", {
      inviter_name: "Bob",
      workspace_name: "Acme Corp",
      workspace_initial: "A",
      role: "editor",
      accept_url: "https://app.test/invitations/accept?token=tok",
      year: 2026,
    })
    expect(html).not.toContain("{{")
    expect(html).toContain("Acme Corp")
    expect(html).toContain("Bob")
    expect(html).toContain("editor")
  })

  it("escapes HTML-special characters in substituted values", () => {
    const html = render("verify-email", {
      full_name: "<script>alert(1)</script>",
      email: "a&b@example.com",
      verification_url: "https://app.test/verify",
      year: 2026,
    })
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;")
    expect(html).toContain("a&amp;b@example.com")
  })
})
