import { parseRedisUrl } from "../../src/utils/redis.js"

describe("parseRedisUrl", () => {
  it("parses a plain redis:// URL without auth", () => {
    const result = parseRedisUrl("redis://localhost:6379")
    expect(result).toEqual({ host: "localhost", port: 6379 })
  })

  it("parses a redis:// URL with password", () => {
    const result = parseRedisUrl("redis://:secret@localhost:6379")
    expect(result).toEqual({ host: "localhost", port: 6379, password: "secret" })
  })

  it("parses a rediss:// URL and sets tls: {}", () => {
    const result = parseRedisUrl("rediss://default:mypassword@redis.example.com:6380")
    expect(result).toEqual({
      host: "redis.example.com",
      port: 6380,
      password: "mypassword",
      tls: {},
    })
  })

  it("URL-decodes percent-encoded passwords", () => {
    const result = parseRedisUrl("rediss://default:p%40ss%21@redis.example.com:6380")
    expect(result).toEqual({
      host: "redis.example.com",
      port: 6380,
      password: "p@ss!",
      tls: {},
    })
  })

  it("defaults to port 6379 when port is absent", () => {
    const result = parseRedisUrl("redis://localhost")
    expect(result.port).toBe(6379)
  })
})
