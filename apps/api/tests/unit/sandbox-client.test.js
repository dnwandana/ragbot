import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// tests/setup.js mocks the sandbox service globally for every other test file. This file
// exercises the real module, so it must opt out before the dynamic import below.
vi.unmock("../../src/services/sandbox.js")

const fetchMock = vi.fn()
vi.stubGlobal("fetch", fetchMock)

process.env.SANDBOX_ENABLED = "true"
process.env.SANDBOX_URL = "http://sandbox:8000"
process.env.SANDBOX_API_TOKEN = "secret"
process.env.SANDBOX_TIMEOUT_MS = "30000"

const { executeCode, isSandboxEnabled } = await import("../../src/services/sandbox.js")

describe("sandbox client", () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("reports enabled from env", () => {
    expect(isSandboxEnabled()).toBe(true)
  })

  it("posts code and base64 files with the bearer token", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, stdout: "1", stderr: "", charts: [], error: null }),
    })

    const result = await executeCode({
      code: "print(1)",
      files: [{ name: "a.csv", content: Buffer.from("x,y") }],
    })

    expect(result.ok).toBe(true)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("http://sandbox:8000/execute")
    expect(init.headers.Authorization).toBe("Bearer secret")
    const body = JSON.parse(init.body)
    expect(body.code).toBe("print(1)")
    expect(body.files[0]).toEqual({
      name: "a.csv",
      content_b64: Buffer.from("x,y").toString("base64"),
    })
    expect(body.timeout_ms).toBe(30000)
  })

  it("maps 429 to a busy observation instead of throwing", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429 })

    const result = await executeCode({ code: "1", files: [] })

    expect(result).toMatchObject({
      ok: false,
      error: "busy",
      stdout: "",
      stderr: "sandbox is busy, try again",
      charts: [],
    })
  })

  it("maps network failure to unavailable instead of throwing", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"))

    const result = await executeCode({ code: "1", files: [] })

    expect(result).toMatchObject({
      ok: false,
      error: "unavailable",
      stdout: "",
      stderr: "sandbox is unavailable",
      charts: [],
    })
  })

  it("maps a 500 to unavailable with the status in stderr", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 })

    const result = await executeCode({ code: "1", files: [] })

    expect(result.error).toBe("unavailable")
    expect(result.stderr).toContain("500")
    expect(result.stdout).toBe("")
    expect(result.charts).toEqual([])
  })

  it("measures the wall time of a successful run", async () => {
    fetchMock.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, stdout: "1", stderr: "", charts: [], error: null }),
      }
    })

    const result = await executeCode({ code: "1", files: [] })

    expect(result.duration_ms).toBeGreaterThanOrEqual(15)
  })

  it("measures the wall time of a failed run", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"))

    const result = await executeCode({ code: "1", files: [] })

    expect(typeof result.duration_ms).toBe("number")
    expect(result.duration_ms).toBeGreaterThanOrEqual(0)
  })

  it("defaults files to an empty list and honours a timeoutMs override", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, stdout: "", stderr: "", charts: [], error: null }),
    })

    await executeCode({ code: "1", timeoutMs: 5000 })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.files).toEqual([])
    expect(body.timeout_ms).toBe(5000)
  })
})
