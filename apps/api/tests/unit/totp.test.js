import { authenticator } from "otplib"
import {
  generateTotpSecret,
  buildOtpauthUrl,
  verifyTotp,
  getMatchedStep,
} from "../../src/utils/totp.js"

beforeAll(() => {
  process.env.TOTP_ISSUER = "RAGbot Test"
})

describe("totp", () => {
  it("generates a non-empty base32 secret", () => {
    const secret = generateTotpSecret()
    expect(typeof secret).toBe("string")
    expect(secret.length).toBeGreaterThan(10)
  })

  it("verifies a freshly computed token", () => {
    const secret = generateTotpSecret()
    const token = authenticator.generate(secret)
    expect(verifyTotp({ secret, token })).toBe(true)
  })

  it("rejects a wrong token", () => {
    const secret = generateTotpSecret()
    expect(verifyTotp({ secret, token: "000000" })).toBe(false)
  })

  it("builds an otpauth URL carrying issuer and account", () => {
    const url = buildOtpauthUrl({ email: "user@example.com", secret: "JBSWY3DPEHPK3PXP" })
    expect(url.startsWith("otpauth://totp/")).toBe(true)
    expect(url).toContain("issuer=RAGbot%20Test")
    expect(decodeURIComponent(url)).toContain("user@example.com")
  })

  it("getMatchedStep returns a numeric step for a valid token", () => {
    const secret = generateTotpSecret()
    const token = authenticator.generate(secret)
    const step = getMatchedStep({ secret, token })
    expect(typeof step).toBe("number")
    expect(step).toBe(Math.floor(Date.now() / 1000 / 30))
  })

  it("getMatchedStep returns null for an invalid token", () => {
    const secret = generateTotpSecret()
    expect(getMatchedStep({ secret, token: "000000" })).toBeNull()
  })
})
