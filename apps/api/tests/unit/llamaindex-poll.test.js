import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { pollForMarkdown } from "../../src/services/llamaindex.js"

describe("pollForMarkdown", () => {
  let originalFetch

  beforeEach(() => {
    originalFetch = global.fetch
    process.env.LLAMAINDEX_API_KEY = "test-key"
  })

  afterEach(() => {
    global.fetch = originalFetch
    delete process.env.LLAMAINDEX_API_KEY
  })

  it("returns joined markdown when job is COMPLETED on first poll", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        job: { status: "COMPLETED" },
        markdown: { pages: [{ markdown: "# Page 1" }, { markdown: "# Page 2" }] },
      }),
    })

    const result = await pollForMarkdown("pjb-test", { intervalMs: 0 })
    expect(result).toBe("# Page 1\n\n# Page 2")
    expect(global.fetch).toHaveBeenCalledOnce()
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("pjb-test?expand=markdown"),
      expect.any(Object),
    )
  })

  it("polls until COMPLETED when job is initially PENDING", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ job: { status: "PENDING" }, markdown: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          job: { status: "COMPLETED" },
          markdown: { pages: [{ markdown: "content" }] },
        }),
      })

    const result = await pollForMarkdown("pjb-test", { intervalMs: 0 })
    expect(result).toBe("content")
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it("throws immediately when job status is ERROR", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ job: { status: "ERROR" }, markdown: null }),
    })

    await expect(pollForMarkdown("pjb-test", { intervalMs: 0 })).rejects.toThrow(
      "LlamaIndex job pjb-test failed (status: ERROR)",
    )
    expect(global.fetch).toHaveBeenCalledOnce()
  })

  it("throws immediately when job status is FAILED", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ job: { status: "FAILED" }, markdown: null }),
    })

    await expect(pollForMarkdown("pjb-test", { intervalMs: 0 })).rejects.toThrow(
      "LlamaIndex job pjb-test failed (status: FAILED)",
    )
    expect(global.fetch).toHaveBeenCalledOnce()
  })

  it("throws when poll response is non-2xx", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 503 })

    await expect(pollForMarkdown("pjb-test", { intervalMs: 0 })).rejects.toThrow(
      "LlamaIndex result error: 503",
    )
    expect(global.fetch).toHaveBeenCalledOnce()
  })

  it("throws when timeout is exceeded before job completes", async () => {
    global.fetch = vi.fn()

    await expect(pollForMarkdown("pjb-test", { intervalMs: 0, timeoutMs: 0 })).rejects.toThrow(
      "timed out after 0s",
    )
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
