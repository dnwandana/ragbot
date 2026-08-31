import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"

const store = new Map()
vi.mock("../../src/utils/redis-client.js", () => ({
  getClient: () => ({
    async get(key) {
      return store.get(key) ?? null
    },
    async set(key, val) {
      store.set(key, val)
      return "OK"
    },
  }),
}))

let consumeStep

beforeAll(async () => {
  const actual = await vi.importActual("../../src/utils/mfa-totp-replay.js")
  consumeStep = actual.consumeStep
})

beforeEach(() => store.clear())

describe("mfa-totp-replay", () => {
  it("accepts a fresh step and records it", async () => {
    expect(await consumeStep("user-1", 100)).toBe(true)
  })

  it("rejects an exact replay of the same step", async () => {
    await consumeStep("user-1", 100)
    expect(await consumeStep("user-1", 100)).toBe(false)
  })

  it("rejects an older step than the last used", async () => {
    await consumeStep("user-1", 100)
    expect(await consumeStep("user-1", 99)).toBe(false)
  })

  it("accepts a newer step and is isolated per user", async () => {
    await consumeStep("user-1", 100)
    expect(await consumeStep("user-1", 101)).toBe(true)
    expect(await consumeStep("user-2", 100)).toBe(true)
  })
})
