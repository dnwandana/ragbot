import { beforeAll } from "vitest"
import { encryptSecret, decryptSecret } from "../../src/utils/totp-crypto.js"

beforeAll(() => {
  process.env.TOTP_ENCRYPTION_KEY = "test-totp-encryption-key-at-least-32-chars"
})

describe("totp-crypto", () => {
  it("round-trips a secret", () => {
    const secret = "JBSWY3DPEHPK3PXP"
    const cipher = encryptSecret(secret)
    expect(cipher).not.toContain(secret)
    expect(cipher.startsWith("v1:")).toBe(true)
    expect(decryptSecret(cipher)).toBe(secret)
  })

  it("produces a different ciphertext each call (random IV)", () => {
    expect(encryptSecret("JBSWY3DPEHPK3PXP")).not.toBe(encryptSecret("JBSWY3DPEHPK3PXP"))
  })

  it("rejects a tampered ciphertext", () => {
    const cipher = encryptSecret("JBSWY3DPEHPK3PXP")
    const parts = cipher.split(":")
    parts[3] = Buffer.from("tampered").toString("base64url")
    expect(() => decryptSecret(parts.join(":"))).toThrow()
  })

  it("rejects a malformed payload", () => {
    expect(() => decryptSecret("not-a-valid-payload")).toThrow()
  })
})
