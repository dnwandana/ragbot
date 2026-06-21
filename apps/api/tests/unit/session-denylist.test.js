import { vi, beforeAll, beforeEach, describe, it, expect } from "vitest"

// Controllable Redis spies. Hoisted so the `ioredis` mock factory can close over them.
const { redisSet, redisExists } = vi.hoisted(() => ({
  redisSet: vi.fn(),
  redisExists: vi.fn(),
}))

// Swap ioredis for an in-memory fake so the real denylist module exercises its own
// logic (key format, derived TTL, fail-soft/fail-open) without a live Redis.
vi.mock("ioredis", () => ({
  default: class Redis {
    on() {}
    set(...args) {
      return redisSet(...args)
    }
    exists(...args) {
      return redisExists(...args)
    }
  },
}))

let denySession, isSessionDenied

describe("session-denylist", () => {
  beforeAll(async () => {
    // Bypass the global mock in tests/setup.js and load the real implementation.
    const actual = await vi.importActual("../../src/utils/session-denylist.js")
    denySession = actual.denySession
    isSessionDenied = actual.isSessionDenied
  })

  beforeEach(() => {
    vi.clearAllMocks()
    redisSet.mockResolvedValue("OK")
    redisExists.mockResolvedValue(0)
    process.env.REDIS_URL = "redis://localhost:6379"
    process.env.ACCESS_TOKEN_EXPIRES_IN = "15m"
  })

  it("denylists a session under a prefixed key with an EX TTL", async () => {
    await denySession("sid-1")
    expect(redisSet).toHaveBeenCalledTimes(1)
    const [key, value, exFlag] = redisSet.mock.calls[0]
    expect(key).toBe("denylist:sid-1")
    expect(value).toBe("1")
    expect(exFlag).toBe("EX")
  })

  it("derives the TTL from ACCESS_TOKEN_EXPIRES_IN so it always outlives the access token", async () => {
    process.env.ACCESS_TOKEN_EXPIRES_IN = "30m"
    await denySession("sid-30m")
    const ttl = redisSet.mock.calls[0][3]
    // Must cover the full 30-minute access-token lifetime, plus a small skew.
    expect(ttl).toBeGreaterThanOrEqual(30 * 60)
    expect(ttl).toBeLessThan(30 * 60 + 60)
  })

  it("scales the TTL with the configured lifetime (1h > 15m)", async () => {
    process.env.ACCESS_TOKEN_EXPIRES_IN = "15m"
    await denySession("a")
    const short = redisSet.mock.calls[0][3]
    vi.clearAllMocks()
    redisSet.mockResolvedValue("OK")
    process.env.ACCESS_TOKEN_EXPIRES_IN = "1h"
    await denySession("b")
    const long = redisSet.mock.calls[0][3]
    expect(short).toBeGreaterThanOrEqual(15 * 60)
    expect(long).toBeGreaterThanOrEqual(60 * 60)
    expect(long).toBeGreaterThan(short)
  })

  it("falls back to a 15-minute TTL when ACCESS_TOKEN_EXPIRES_IN is missing or malformed", async () => {
    delete process.env.ACCESS_TOKEN_EXPIRES_IN
    await denySession("sid-fallback")
    const ttl = redisSet.mock.calls[0][3]
    expect(ttl).toBeGreaterThanOrEqual(15 * 60)
    expect(ttl).toBeLessThan(15 * 60 + 60)
  })

  it("no-ops without touching Redis when the sid is empty", async () => {
    await denySession("")
    await denySession(null)
    expect(redisSet).not.toHaveBeenCalled()
  })

  it("fails soft — a Redis error during denylisting is swallowed, not thrown", async () => {
    redisSet.mockRejectedValue(new Error("redis down"))
    await expect(denySession("sid-err")).resolves.toBeUndefined()
  })

  it("reports a session as denied when the key exists", async () => {
    redisExists.mockResolvedValue(1)
    expect(await isSessionDenied("sid-x")).toBe(true)
    expect(redisExists).toHaveBeenCalledWith("denylist:sid-x")
  })

  it("reports not-denied when the key is absent", async () => {
    redisExists.mockResolvedValue(0)
    expect(await isSessionDenied("sid-x")).toBe(false)
  })

  it("fails open — a Redis error during the check returns false so auth still works", async () => {
    redisExists.mockRejectedValue(new Error("redis down"))
    expect(await isSessionDenied("sid-x")).toBe(false)
  })

  it("returns false for an empty sid without touching Redis", async () => {
    expect(await isSessionDenied("")).toBe(false)
    expect(redisExists).not.toHaveBeenCalled()
  })
})
