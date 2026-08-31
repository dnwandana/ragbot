import { describe, it, expect } from "vitest"
import {
  generateChallengeToken,
  verifyChallengeToken,
  verifyAccessToken,
} from "../../src/utils/jwt.js"

describe("challenge token", () => {
  it("encodes the user id and 2fa_challenge type", () => {
    const token = generateChallengeToken("user-123")
    const decoded = verifyChallengeToken(token)
    expect(decoded.id).toBe("user-123")
    expect(decoded.type).toBe("2fa_challenge")
  })

  it("is signed with the access secret (verifyAccessToken accepts the signature)", () => {
    const token = generateChallengeToken("user-123")
    // Same secret, so signature verifies — but the type guard elsewhere rejects it as an access token.
    const decoded = verifyAccessToken(token)
    expect(decoded.type).toBe("2fa_challenge")
  })
})
