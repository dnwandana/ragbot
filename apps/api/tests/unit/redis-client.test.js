import { vi, beforeEach, describe, it, expect } from "vitest"

const { onSpy, ctorSpy } = vi.hoisted(() => ({ onSpy: vi.fn(), ctorSpy: vi.fn() }))

vi.mock("ioredis", () => ({
  default: class Redis {
    constructor(opts) {
      ctorSpy(opts)
    }
    on(...args) {
      return onSpy(...args)
    }
  },
}))

let getClient

describe("redis-client", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env.REDIS_URL = "rediss://:p%40ss@example.com:6380"
    ;({ getClient } = await vi.importActual("../../src/utils/redis-client.js"))
  })

  it("builds the client via parseRedisUrl (TLS + decoded password)", () => {
    getClient()
    expect(ctorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ host: "example.com", port: 6380, password: "p@ss", tls: {} }),
    )
  })

  it("registers an error listener so a Redis error can't crash the process", () => {
    getClient()
    expect(onSpy).toHaveBeenCalledWith("error", expect.any(Function))
  })

  it("memoizes a single client instance", () => {
    expect(getClient()).toBe(getClient())
    expect(ctorSpy).toHaveBeenCalledTimes(1)
  })

  it("bounds command latency so MFA paths fail fast when Redis is down", () => {
    getClient()
    expect(ctorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        maxRetriesPerRequest: 2,
        connectTimeout: 2000,
        commandTimeout: 2000,
        enableOfflineQueue: false,
      }),
    )
  })
})
