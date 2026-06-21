import { generateAccessToken, verifyAccessToken } from "../src/utils/jwt.js"

describe("jwt — sid claim", () => {
  it("embeds sid when provided and omits it otherwise", () => {
    const withSid = verifyAccessToken(generateAccessToken("user-1", "session-1"))
    expect(withSid.sid).toBe("session-1")
    expect(withSid.id).toBe("user-1")

    const withoutSid = verifyAccessToken(generateAccessToken("user-1"))
    expect(withoutSid.sid).toBeUndefined()
  })
})
