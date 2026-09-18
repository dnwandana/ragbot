import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../src/services/openrouter.js", () => ({
  chatCompletion: vi.fn(),
}))

import { chatCompletion } from "../../src/services/openrouter.js"
import { generateTitle } from "../../src/services/title-generator.js"

const reply = (content) => ({ choices: [{ message: { content } }] })

describe("generateTitle", () => {
  beforeEach(() => {
    chatCompletion.mockReset()
    process.env.UTILITY_MODEL = "openai/gpt-5.4-nano"
  })
  afterEach(() => vi.restoreAllMocks())

  it("returns the trimmed title from the model", async () => {
    chatCompletion.mockResolvedValue(reply("  Capital of France  \n"))

    const title = await generateTitle("What is the capital of France?", "Paris.")

    expect(title).toBe("Capital of France")
  })

  it("sends the user message and the reply to the UTILITY_MODEL with a small token cap", async () => {
    chatCompletion.mockResolvedValue(reply("Capital of France"))

    await generateTitle("What is the capital of France?", "Paris is the capital.")

    const [messages, options] = chatCompletion.mock.calls[0]
    expect(messages[0].role).toBe("system")
    expect(messages[1].role).toBe("user")
    expect(messages[1].content).toContain("What is the capital of France?")
    expect(messages[1].content).toContain("Paris is the capital.")
    expect(options.model).toBe("openai/gpt-5.4-nano")
    expect(options.max_tokens).toBeLessThanOrEqual(64)
  })

  it("truncates long inputs before the call", async () => {
    chatCompletion.mockResolvedValue(reply("Long question"))

    await generateTitle("a".repeat(5000), "b".repeat(5000))

    const [messages] = chatCompletion.mock.calls[0]
    expect(messages[1].content.length).toBeLessThan(4200)
  })

  it("strips wrapping quotes and a trailing period", async () => {
    chatCompletion.mockResolvedValue(reply('"Capital of France."'))

    expect(await generateTitle("q", "a")).toBe("Capital of France")
  })

  it("collapses the title to one line and caps it at 100 characters", async () => {
    chatCompletion.mockResolvedValue(reply(`${"x".repeat(80)}\n${"y".repeat(80)}`))

    const title = await generateTitle("q", "a")

    expect(title).not.toContain("\n")
    expect(title.length).toBe(100)
  })

  it("returns null when the model returns an empty title", async () => {
    chatCompletion.mockResolvedValue(reply('""'))

    expect(await generateTitle("q", "a")).toBeNull()
  })

  it("returns null when the model call fails", async () => {
    chatCompletion.mockRejectedValue(new Error("boom"))

    expect(await generateTitle("q", "a")).toBeNull()
  })
})
