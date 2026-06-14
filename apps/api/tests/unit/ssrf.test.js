import { vi } from "vitest"

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }))

import { lookup } from "node:dns/promises"
import { isPrivateIp, assertPublicHttpUrl } from "../../src/utils/ssrf.js"

beforeEach(() => vi.clearAllMocks())

describe("isPrivateIp", () => {
  it.each([
    ["127.0.0.1", true],
    ["10.0.0.5", true],
    ["172.16.0.1", true],
    ["192.168.1.1", true],
    ["169.254.169.254", true],
    ["0.0.0.0", true],
    ["::1", true],
    ["::ffff:127.0.0.1", true],
    ["::ffff:7f00:1", true],
    ["::ffff:93.184.216.34", false],
    ["::", true],
    ["8.8.8.8", false],
    ["93.184.216.34", false],
  ])("classifies %s as private=%s", (ip, expected) => {
    expect(isPrivateIp(ip)).toBe(expected)
  })
})

describe("assertPublicHttpUrl", () => {
  it("rejects a non-http(s) scheme", async () => {
    await expect(assertPublicHttpUrl("ftp://example.com")).rejects.toMatchObject({ status: 400 })
  })

  it("rejects localhost without a DNS lookup", async () => {
    await expect(assertPublicHttpUrl("http://localhost:3000")).rejects.toMatchObject({
      status: 400,
    })
    expect(lookup).not.toHaveBeenCalled()
  })

  it("rejects a private IP literal without a DNS lookup", async () => {
    await expect(assertPublicHttpUrl("http://169.254.169.254/latest")).rejects.toMatchObject({
      status: 400,
    })
    expect(lookup).not.toHaveBeenCalled()
  })

  it("rejects a hostname that resolves to a private address", async () => {
    lookup.mockResolvedValueOnce([{ address: "10.0.0.5", family: 4 }])
    await expect(assertPublicHttpUrl("http://internal.example.com")).rejects.toMatchObject({
      status: 400,
    })
  })

  it("accepts a hostname that resolves to a public address", async () => {
    lookup.mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }])
    await expect(assertPublicHttpUrl("https://example.com/page")).resolves.toBeUndefined()
  })
})
