import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { chatCompletion, chatCompletionStream } from "../../src/services/openrouter.js"

describe("openrouter max_tokens pass-through", () => {
  let captured

  beforeEach(() => {
    process.env.OPENROUTER_TIMEOUT_MS = "30000"
    process.env.OPENROUTER_STREAM_TIMEOUT_MS = "60000"
    captured = null
    vi.stubGlobal("fetch", async (_url, opts) => {
      captured = JSON.parse(opts.body)
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: "" } }] }),
        body: "stream",
      }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("omits max_tokens from the chatCompletion body when not provided", async () => {
    await chatCompletion([{ role: "user", content: "hi" }])
    expect(captured).not.toHaveProperty("max_tokens")
  })

  it("includes max_tokens in the chatCompletion body when explicitly provided", async () => {
    await chatCompletion([{ role: "user", content: "hi" }], { max_tokens: 512 })
    expect(captured.max_tokens).toBe(512)
  })

  it("omits max_tokens from the chatCompletionStream body when not provided", async () => {
    await chatCompletionStream([{ role: "user", content: "hi" }])
    expect(captured).not.toHaveProperty("max_tokens")
  })

  it("includes max_tokens in the chatCompletionStream body when explicitly provided", async () => {
    await chatCompletionStream([{ role: "user", content: "hi" }], { max_tokens: 256 })
    expect(captured.max_tokens).toBe(256)
  })
})
