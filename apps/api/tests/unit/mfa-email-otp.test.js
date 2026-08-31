import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"

// In-memory Redis stub shared by the module under test.
const store = new Map()
// Keys whose delete "loses" — simulates a concurrent verifier consuming the
// code between our GET and DEL.
const raceKeys = new Set()
vi.mock("../../src/utils/redis-client.js", () => ({
  getClient: () => ({
    async set(key, val) {
      store.set(key, val)
      return "OK"
    },
    async get(key) {
      return store.get(key) ?? null
    },
    async del(key) {
      if (raceKeys.has(key)) return 0
      return store.delete(key) ? 1 : 0
    },
    async ttl(key) {
      return store.has(key) ? 240 : -2
    },
  }),
}))

let issue, verify, cooldownRemaining

beforeAll(async () => {
  // Bypass the global mock in tests/setup.js and exercise the real implementation
  // against the in-memory redis-client stub above.
  const actual = await vi.importActual("../../src/utils/mfa-email-otp.js")
  issue = actual.issue
  verify = actual.verify
  cooldownRemaining = actual.cooldownRemaining
})

beforeEach(() => {
  store.clear()
  raceKeys.clear()
})

describe("mfa-email-otp", () => {
  it("issues a 6-digit code and verifies it once", async () => {
    const code = await issue("user-1")
    expect(code).toMatch(/^\d{6}$/)
    expect(await verify("user-1", code)).toBe(true)
    expect(await verify("user-1", code)).toBe(false) // single-use
  })

  it("rejects a wrong code", async () => {
    await issue("user-1")
    expect(await verify("user-1", "000000")).toBe(false)
  })

  it("reports a cooldown after issuing", async () => {
    await issue("user-1")
    expect(await cooldownRemaining("user-1")).toBeGreaterThan(0)
  })

  it("returns false (no throw) when the stored value is malformed", async () => {
    store.set("mfa:email:user-1", "not-a-valid-hex-digest")
    expect(await verify("user-1", "123456")).toBe(false)
  })

  it("returns false when a concurrent verify already consumed the code", async () => {
    const code = await issue("user-1")
    raceKeys.add("mfa:email:user-1")
    expect(await verify("user-1", code)).toBe(false)
  })

  it("a wrong code does not burn the stored code", async () => {
    const code = await issue("user-1")
    expect(await verify("user-1", "000000")).toBe(false)
    expect(await verify("user-1", code)).toBe(true)
  })
})
