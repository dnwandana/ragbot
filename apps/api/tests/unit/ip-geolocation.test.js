import { vi, beforeEach, afterEach, describe, it, expect } from "vitest"
import { lookupLocation } from "../../src/services/ip-geolocation.js"

describe("ip-geolocation service", () => {
  beforeEach(() => {
    process.env.IPGEOLOCATION_API_KEY = "test-key"
    process.env.IPGEOLOCATION_TIMEOUT_MS = "5000"
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns null for a private IP without calling the API", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
    expect(await lookupLocation("10.0.0.5")).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("returns 'City, CC' on a successful lookup", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ location: { city: "Berlin", country_code2: "DE" } }),
    })
    expect(await lookupLocation("203.0.113.7")).toBe("Berlin, DE")
  })

  it("returns null when the API errors", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network down"))
    expect(await lookupLocation("203.0.113.7")).toBeNull()
  })

  it("returns null when the API key is missing", async () => {
    delete process.env.IPGEOLOCATION_API_KEY
    const fetchSpy = vi.spyOn(global, "fetch")
    expect(await lookupLocation("203.0.113.7")).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
